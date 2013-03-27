var crawlServer = require('../../crawl-server');

crawlServer.createServer({
  staticBase:  __dirname + '/public',
  crawlerBase: __dirname + '/crawler'
});