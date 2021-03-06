// Author: Felix Hoerandner (2014)

var webpage = require('webpage');

// returns a function that will execute the given function just once
var once = exports.once = function (fun) {
  var triggered = false;
  return function () {
    if (triggered)
      return;
    triggered = true;

    return fun.apply(this, arguments);
  };
};

// creates a phantomjs page
// output context.page: phantomjs webpage
// emits undefined
exports.createPage = function (context, done) {
  context.page = webpage.create();
  done();
};

// loads a url in a previously created page
// closure url
// input context.page: phantomjs webpage
// emits loaded or error
exports.loadPage = function (url) {
  return function (context, done) {
    var page = context.page;

    page.settings.loadImages = false;
    page.settings.resourceTimeout = 5000;

    /*
    page.onInitialized = function() {
        console.log("page.onInitialized");
    };
    page.onLoadStarted = function() {
        console.log("page.onLoadStarted");
    };
    page.onLoadFinished = function(s) {
        console.log("page.onLoadFinished", s);
    };
    page.onUrlChanged = function() {
        console.log("page.onUrlChanged");
    };
    page.onNavigationRequested = function(url, type) {
        console.log("page.onNavigationRequested", url, type);
    };
    page.onResourceRequested = function(rd) {
        console.log("page.onResourceRequested", rd.id, rd.url);
    };
    page.onResourceError = function(e) {
        console.log("page.onResourceError1", e.id, e.url, e.errorCode, e.errorString);
    };
    page.onResourceError = function(e) {
        console.log("page.onResourceError2", e.id, e.url, e.errorCode, e.errorString);
    };
    page.onClosing = function() {
        console.log("page.onClosing");
    };
    */

    page.open(url, function (status) {
      if (status != 'success')
        return done('error', status);
      done('loaded');
    });
  };
};

// injects the given scripts into a previously created page
// the scripts may be remote or from the local file system
// closure scripts: array of urls
// input context.page: phantomjs webpage
// emits injected or error
exports.injectScripts = function (scripts) {
  return function (context, done) {
    var page = context.page;
    var injectScript = function (script, callback) {
      var isRemoteFile = script.indexOf('http://')  === 0 ||
                         script.indexOf('https://') === 0;

      if (isRemoteFile) {
        var onceCallback = once(callback);
        page.onResourceError = function (event) {
          if (event.url === script)
            onceCallback('could not load script: ' + script);
        };
        page.includeJs(script, function () {
          onceCallback(null);
        });
      } else {
        var success = page.injectJs(script);
        callback(!success);
      }
    };

    var injectAll = function (number) {
      if (number >= scripts.length)
        return done('injected');

      var script = scripts[number];
      injectScript(script, function (err) {
        if (err)
          return done('error', err);
        injectAll(number+1);
      });
    };

    injectAll(0);
  };
};

// calls the given function with it's arguments in the page's context
// closure storeFun: function that is executed with the context and the collected data
// closure fun: function to execute in page's context
// closure args: arguments for that function
// input context.page: phantomjs webpage
// emits undefined
exports.extractData = function (storeFun, fun, args) {
  return function (context, done) {
    var page = context.page;
    var evalArgs = args !== undefined ? [fun].concat(args) : [fun];
    var data = page.evaluate.apply(page, evalArgs);
    storeFun(context, data);
    done();
  };
};

// calls the given function with it's arguments in the page's context
// closure fun: function to execute in page's context
// closure args: arguments for that function
// input context.page: phantomjs webpage
// emits undefined
exports.execute = function (fun, args) {
  return function (context, done) {
    var page = context.page;
    var evalArgs = args !== undefined ? [fun].concat(args) : [fun];
    var data = page.evaluate.apply(page, evalArgs);
    done(data || undefined);
  };
};

// calls the given function with it's arguments in the page's context
// closure fun: function to execute in page's context
// closure args: arguments for that function
// input context.page: phantomjs webpage
// emits loaded once the page has finished loading
exports.navigate = function (fun, args) {
  return function (context, done) {
    var page = context.page;

    var onceDone = once(done);
    page.onLoadFinished = function () {
      onceDone('loaded');
    };

    var evalArgs = args !== undefined ? [fun].concat(args) : [fun];
    page.evaluate.apply(page, evalArgs);
  };
};

// clojure time: milliseconds to wait
// emits 'waited' after the specified time
exports.wait = function (time) {
  return function (context, done) {
    setTimeout(function () {
      done('waited');
    }, time);
  };
};

// TODO
exports.waitUntilLoaded = function () {
  return function (context, done) {
    var page = context.page;

    var onceDone = once(done);
    page.onLoadFinished = function () {
      onceDone('loaded');
    };
  };
};

// extracts the GET parameters from an url string into an object
// input url: a path of an url, like "/?bla=blubb"
// returns: a object containing the parameters, like {bla: "blubb"}
// function adapted from: http://stackoverflow.com/a/2880929
var getParams = exports.getParams = function (url) {
  var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = url.substring(2);

  var urlParams = {};
  while (match = search.exec(query))
     urlParams[decode(match[1])] = decode(match[2]);

  return urlParams;
};

// serves the results of a crawl via http
// crawls can be triggered by requesting the web service
// GET and POST parameters can be accessed via 
// context.getParams and context.postParams
// the web server prints whatever is stored under context.data
// input crawler: state machine
// input port: port on which the http server should listen
// returns function(): stops the server when called
exports.serve = function (crawler, port) {
  var webserver = require('webserver');
  var server = webserver.create();

  var service = server.listen(port, function(request, response) {
    var context = {
      postParams: request.post,
      getParams: getParams(request.url)
    };

    crawler(context, function (event, context) {
      response.statusCode = 200;
      response.headers = {
          'Cache': 'no-cache',
          'Content-Type': 'application/json;charset=utf-8'
      };
      response.write(JSON.stringify(context.data, null, 2));
      response.close();
    });
  });

  return function () {
    server.close();
  };
};