var phantom = require('node-phantom');
var url = require('url');

var PHANTOM_BINARY = '/bin/phantomjs';

var phantomjs = null; // will be initialized on first call to queue.process()


//## Randomly Periodic #########################################################


var getRandomTime = function (min, max) {
  return min + Math.random() * (max-min);
};

var setRandomTimeout = function (callback) {
  var time = getRandomTime(300, 1000);
  return setTimeout(callback, time);
};

var randomlyPeriodic = function (callback) {

  var timeout = null;

  var startPeriodic = function () {
    timeout = setRandomTimeout(function () {
      callback(function () {
        if (timeout !== null)
          startPeriodic();
      });
    });
  };

  var stopPeriodic = function () {
    clearTimeout(timeout);
    timeout = null;
  };

  var setRunning = function (run) {
    if (timeout === null && run) {
      console.log('starting queue processing');
      startPeriodic();
    } else if (timeout !== null && !run) {
      console.log('stopping queue processing');
      stopPeriodic();
    }
  };

  var isRunning = function () {
    return timeout !== null;
  };

  return {
    setRunning: setRunning,
    isRunning: isRunning
  };

};


//## Queue #####################################################################


var createQueue = function () {

  var requests = [];

  var processRequest = function (request, callback) {

    var createPage = function (callback) {
      phantomjs.createPage(function (err, page) {
        if (err)
          return callback(err);
        page.open(request.url, function (err) {
          callback(err, page);
        });
      });
    };

    var extractData = function (page, callback) {
      page.evaluate(request.extractFunction, callback);
    };

    console.log('processing request', request.url);

    createPage(function (err, page) {
      if (err)
        return callback(err);
      extractData(page, function (err, result) {
        if (err)
          return callback(err);
        console.log('processed request', request.url);
        page.close();
        request.callback(null, result);
        callback();
      });
    });

  };

  var periodic = randomlyPeriodic(function (next) {
    var request = requests.shift();
    processRequest(request, function () {
      if (requests.length === 0)
        periodic.setRunning(false);
      next();
    });
  });

  return {
    process: function (request) {
      requests.push(request);
      periodic.setRunning(true);
    }
  };

};


var getQueue = (function () {

  // host -> task
  var queues = {};
  
  return function (host) {
    if (!queues[host])
      queues[host] = createQueue(host)
    
    return queues[host];
  };

})();


//## Export ####################################################################


var process = function (request) {
  var host = url.parse(request.url).host;

  var queue = getQueue(host);
  queue.process(request);
};

var processExtendedArgs = function (pageUrl, extractFunction, callback) {
  var request = {
    url: pageUrl,
    extractFunction: extractFunction,
    callback: callback
  };

  process(request);
};

exports.process = (function () {

  var requests = [];

  var created = function (err, ph) {
    phantomjs = ph;
    exports.process = processExtendedArgs;
    requests.forEach(process);
  };

  return function (pageUrl, extractFunction, callback) {

    var request = {
      url: pageUrl,
      extractFunction: extractFunction,
      callback: callback
    };
    requests.push(request);

    if (requests.length === 1) // first
      phantom.create(created, { phantomPath: __dirname + PHANTOM_BINARY });

  };

})();
