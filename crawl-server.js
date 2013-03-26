var http = require('http');
var fs = require('fs');
var path = require('path');
 
var mimes = {
  '.js':   'text/javascript', // or application/javascript
  '.json': 'application/json',

  '.htm':  'text/html',
  '.html': 'text/html',

  '.css':  'text/css',

  '.gif':  'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg':  'image/jpeg',
  '.png':  'image/png'
};

exports.createServer = function (options) {

  var staticBase = options.staticBase;
  var crawlerBase = options.crawlerBase;
  var crawlerPublicBase = options.crawlerPublicBase || '/crawler';
  var port = options.port || 8000;


  var serveStatic = function (reqUrl, response) {

    console.log('STATIC', reqUrl);
    
    var filePath = staticBase + reqUrl;
    if (reqUrl[reqUrl.length-1] === '/')
      filePath += 'index.html'

    fs.exists(filePath, function(exists) {
     
      if (!exists) {
        response.writeHead(404);
        response.end();
        return;
      }

      fs.readFile(filePath, function(error, content) {
        if (error) {
          response.writeHead(500);
          response.end();
          return;
        }
         
        var extname = path.extname(filePath);
        var contentType = mimes[extname] || 'text/html';

        response.writeHead(200, { 'Content-Type': contentType });
        response.end(content, 'utf-8');
      });

    });

  };


  var content = null; // TODO caching for testing

  var serveCrawler = function (reqUrl, response) {

    console.log('DYNAMIC', reqUrl);

    var crawlerName = reqUrl.substring(crawlerPublicBase.length);
    var filePath = crawlerBase + crawlerName + '.js';

    fs.stat(filePath, function(err, stats) {
     
      if (err || !stats.isFile()) {
        response.writeHead(404);
        response.end('No crawler registered for given name');
        return;
      }

      var crawler = require(filePath);
      crawler.crawl(function (error, content) {
        if (error) {
          response.writeHead(500);
          response.end('Error during crawl');
          return;
        }

        response.writeHead(200, { 'Content-Type': mimes['.json'] });
        response.end(JSON.stringify(content), 'utf-8');
      });

    });

  };


  http.createServer(function (request, response) {

    var reqUrl = path.normalize(request.url);

    if (crawlerBase !== undefined && crawlerBase !== null && 
        reqUrl.indexOf(crawlerPublicBase) === 0) {

      // search crawler and execute it
      serveCrawler(reqUrl, response);

    } else if (staticBase !== undefined && staticBase !== null) {

      // search static file and return it
      serveStatic(reqUrl, response);

    } else {

      // send 404
      response.writeHead(404);
      response.end();

    }

  }).listen(port);
   
  console.log('Server running at http://localhost:' + port + '/');

};