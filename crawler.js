var phantom = require('node-phantom');
var url = require('url');

// Change this path, if you want to place the phantomjs-binary somewhere else.
// The path is relative to this file.
var PHANTOM_BINARY = '/bin/phantomjs';

// Specifies the timeout between requests to one host (in ms).
// The actual timeout will be randomly between min and max.
var MIN_TIMEOUT = 300;
var MAX_TIMEOUT = 1000;

// This will be initialized on first call to `exports.process()`.
var phantomjs = null;


//# Queue ######################################################################


/*
  ## getRandomInRange
  @param {Number} min lower limit
  @param {Number} max upper limit
  @return a random number between min and max
*/
var getRandomInRange = function (min, max) {
  return min + Math.random() * (max-min);
};

/*
  ## setRandomTimeout
  Calls callback after a random amount of time, 
  that is between MIN_TIMEOUT and MAX_TIMEOUT.
  @param {function()} callback called after random time
*/
var setRandomTimeout = function (callback) {
  var time = getRandomInRange(MIN_TIMEOUT, MAX_TIMEOUT);
  return setTimeout(callback, time);
};

/*
  ## createQueue
  @param {function(item, callback)} processFunction processes the given item
    and calls callback when done.
*/
var createQueue = function (processFunction) {

  var items = [];
  var running = false;

  // Adds an item to the queue and 
  // starts periodical processing if not already running.
  var addToQueue = function (item) {
    items.push(item);
    if (!running)
      processPeriodically();
    running = true;
  };

  // Takes an item from the queue and 
  // stops further processing if none is available anymore.
  var takeFromQueue = function () {
    var item = items.shift();
    if (items.length === 0)
      running = false;
    return item;
  };

  // Takes items from the queue and processes them one after another 
  // (with random timeout) until no more are available.
  var processPeriodically = function () {
    setRandomTimeout(function () {
      var item = takeFromQueue();
      processFunction(item, function () {
        if (running)
          processPeriodically();
      });
    });
  };

  /*
    @return {function(anything)} **process** see addToQueue
  */
  return {
    process: addToQueue
  };

};

/*
  ## getQueue
  Retrieves the queue for a given host or creates one.
  @param {String} host the host of a requested url
  @return {Queue} the queue for the given host
*/
var getQueue = (function () {

  // Maps from host to Queue.
  var queues = {};
  
  return function (host) {
    if (!queues[host])
      queues[host] = createQueue(processRequest);
    
    return queues[host];
  };

})();


//# Process Crawl-Request ######################################################


// The type **Request** looks like this:
// ```js
// {
//   url: 'http://myhost.com/site-to-crawl.html',
//   extractorFunction: function () {},
//   callback: function (error, result) {},
//   scripts: String[], optional
// }
// ```

/*
  ## processRequest
  Makes a HTTP-Request for request.url and extracts data from the page's 
  context using request.extractFunction.
  @param {Request} request the queued Crawl-Request
  @param {function()} callback to signal when the request has finished
*/
var processRequest = function (request, callback) {

  // Creates the page and opens the url given by `request.url`.
  var createPage = function (callback) {
    phantomjs.createPage(function (err, page) {
      if (err)
        return callback(err);
      page.open(request.url, function (err) {
        callback(err, page);
      });
    });
  };

  // Injects all scripts, that were given via `request.scripts`.
  // Load script from a server if it starts with http or https.
  // Otherwise it will be loaded from local file system.
  var injectScripts = function (page, callback) {
    var scripts = request.scripts || [];

    var injectScript = function (script, callback) {
      var isRemoteFile = script.indexOf('http://') === 0 || 
                         script.indexOf('https://') === 0;
      var includeFunction = isRemoteFile ? 'includeJs' : 'injectJs';
      page[includeFunction](script, callback);
    };

    var injectAll = function (number) {
      number = number || 0;

      if (number >= scripts.length)
        return callback(null);

      var script = scripts[number];
      injectScript(script, function (err) {
        if (err)
         return callback(err);
        injectAll(number+1);
      });
    };

    injectAll();
  };

  // Extracts data from the page using `request.extractFunction`.
  var extractData = function (page, callback) {
    page.evaluate(request.extractFunction, callback);
  };

  // Then actually perform the steps and handle errors.
  console.log('processing request', request.url);
  createPage(function (err, page) {
    if (err) {
      request.callback(err);
      return callback(err);
    }
    injectScripts(page, function (err) {
      if (err) {
        page.close();
        request.callback(err);
        return callback(err);
      }
      extractData(page, function (err, result) {
        if (err) {
          page.close();
          request.callback(err);
          return callback(err);
        }

        console.log('processed request', request.url);

        page.close();

        // Call the request.callback to return the result and 
        // the local callback to notify the queu, that the extraction has ended.
        request.callback(null, result);
        callback();
      });
    });
  });

};


//# Export #####################################################################

/*
  ## waitForSetup
  Creates a function, which makes sure, that setupFunction completed 
  (signaled by setupFunction's callback), before the regularFunction is called.
  @param {function(callback)} setupFunction sets up some needed resources
  @param {function} regularFunction does something, that needs the set up resources
*/
var waitForSetup = function (setupFunction, regularFunction) {

  var status = 'initial';
  var queue = [];

  // Stores the given args in the queue.
  var putInQueue = function (args) {
    queue.push(args);
  };

  // This function is called as callback from the setupFunction.
  // It makes all previously queued calls to regularFunction.
  var onComplete = function () {
    status = 'complete';
    queue.forEach(function (args) {
      regularFunction.apply(null, args);
    });
  };

  return function () {
    // The first time: call setupFunction and queue the call to regularFunction.
    if (status === 'initial') {
      status = 'waiting';
      setupFunction(onComplete);
      putInQueue(arguments);

    // While setupFunction has not completed: queue the call to regularFunction.
    } else if (status === 'waiting') {
      putInQueue(arguments);

    // After setupFunction has completed: actually call regularFunction.
    } else {
      regularFunction.apply(this, arguments);
    }
  };

};

/*
  ## process
  Queues crawling of given pageUrl with extractFunction.
  Injects local and remote scripts before extraction, if some are given.
  The callback will be called with results after data has been extracted.
  @param {Request} request Object that holds the options listed below.
  @param {String} url url to the page that should be crawled
  @param {String[]} scripts local or remote scripts to be injected (optional)
  @param {function} extractFunction function that is executed in the page's context
  @param {function(error, result)} callback called after extractFunction was executed
*/
var process = function (request) {
  // Acquires queue for host of pageUrl.
  var host = url.parse(request.url).host;
  var queue = getQueue(host);

  // Lets that queue process the request.
  queue.process(request);
};

/*
  ## setupPhantom
  Creates a PhantomJS brower and stores it's reference to field `phantomjs`.
  @param {function} callback to signal that the setup has completed
*/
var setupPhantom = function (callback) {
  phantom.create(function (err, ph) {
    phantomjs = ph;
    callback();
  }, { phantomPath: __dirname + PHANTOM_BINARY });
};

/*
  ## exports.process
  Makes sure that setupPhantom has completed before calling process
  @see setupPhantom, process
*/
exports.process = waitForSetup(setupPhantom, process);
