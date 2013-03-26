var http = require('http');
var fs = require('fs');
var path = require('path');

// Define the most common mime-types.
var mimes = {
  '.js':   'text/javascript',
  '.json': 'application/json',

  '.htm':  'text/html',
  '.html': 'text/html',

  '.css':  'text/css',

  '.gif':  'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg':  'image/jpeg',
  '.png':  'image/png'
};

/*
  # Web Server
  Creates the web server, serves static files and crawler-results.
  @param {Object} options see below
*/
exports.createServer = function (options) {

  // Extract options and set defaults.
  // ```js
  // {
  //   // this directory will be served as web-root
  //   staticBase: '/my/project/static-files',
  //   // the crawlers in this directory will be accessible under crawlerPublicBase
  //   crawlerBase: '/my/project/crawler-files',
  //   // url to access the crawlers, default is /crawler
  //   crawlerPublicBase: '/crawl-data', 
  //   // port on which the server runs, default is 8000
  //   port: 12000 
  // }
  // ```
  var staticBase = options.staticBase;
  var crawlerBase = options.crawlerBase;
  var crawlerPublicBase = options.crawlerPublicBase || '/crawler';
  var port = options.port || 8000;


  /*
    ## serveStatic
    Serves static files under `staticBase` path.
    @param {String} reqUrl the requested and normalized url
    @param {Response} response node's Http-Response-Object
  */
  var serveStatic = function (reqUrl, response) {

    console.log('STATIC', reqUrl);
    
    // Append index.html if a directory was requested.
    var filePath = staticBase + reqUrl;
    if (reqUrl[reqUrl.length-1] === '/')
      filePath += 'index.html'

    // Check if there is a file for the requested url, otherwise return a 404.
    fs.exists(filePath, function(exists) {
      if (!exists) {
        response.writeHead(404);
        response.end();
        return;
      }

      // Read the file, respond with a 500 on failure.
      fs.readFile(filePath, function(error, content) {
        if (error) {
          response.writeHead(500);
          response.end();
          return;
        }
        
        // Send the file back with an appropriate mime-type.
        var extname = path.extname(filePath);
        var contentType = mimes[extname] || 'text/html';

        response.writeHead(200, { 'Content-Type': contentType });
        response.end(content, 'utf-8');
      });

    });

  };


  /*
    ## serveCrawler
    Executes crawlers under `crawlerBase` and serves their results.
    This function will only be called if the request pointed to something below
    `crawlerPublicBase`
    @param {String} reqUrl the requested and normalized url
    @param {Response} response node's Http-Response-Object
  */
  var serveCrawler = function (reqUrl, response) {

    console.log('DYNAMIC', reqUrl);

    // Compute the file name of the crawler.
    var crawlerName = reqUrl.substring(crawlerPublicBase.length);
    var filePath = crawlerBase + crawlerName + '.js';

    // Check if the path exists and is a file, otherwise respond with a 404.
    fs.stat(filePath, function(err, stats) {  
      if (err || !stats.isFile()) {
        response.writeHead(404);
        response.end('No crawler registered for given name');
        return;
      }

      // Load the crawler and execute/queue it.
      var crawler = require(filePath);
      crawler.crawl(function (error, content) {
        // Send a 500 if the crawl failed.
        if (error) {
          response.writeHead(500);
          response.end('Error during crawl');
          return;
        }

        // Convert the result to JSON and send it back.
        response.writeHead(200, { 'Content-Type': mimes['.json'] });
        response.end(JSON.stringify(content), 'utf-8');
      });

    });

  };


  /*
    ## http.createServer
    Creates a web server on given `port`, and dispatches the requests to
    serveStatic or serveCrawler depending on the requested url.
    @param {Request} request node's Http-Response-Object
    @param {Response} response node's Http-Response-Object
  */
  http.createServer(function (request, response) {

    // Normalize makes sure nothing above the base-path can be reached.
    var reqUrl = path.normalize(request.url);

    // If the request points to a crawler: search crawler-file and execute it.
    if (crawlerBase !== undefined && crawlerBase !== null && 
        reqUrl.indexOf(crawlerPublicBase) === 0) {

      serveCrawler(reqUrl, response);

    // Otherwise if a staticBase was defined: search static file and return it.
    } else if (staticBase !== undefined && staticBase !== null) {

      serveStatic(reqUrl, response);

    // Otherwise: send a 404
    } else {

      response.writeHead(404);
      response.end();

    }

  }).listen(port);
   
  console.log('Server running at http://localhost:' + port + '/');

};