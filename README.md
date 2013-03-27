# web-crawler

The `web-crawler` allows you to extract data from dynamic web pages in a powerful, jet convenient way. This is possible by using a headless browser, that injects your crawl-code into the running page-context.
It also provides a web-server, that serves crawl-results and static files to process and display the gathered information.

# Usage

You can either use only the crawler component in your node.js application, or you can also use the web-server component to serve crawl-results and display them with additional static files.

Consider crawling the page at url `http://example.com/shop`:

```html
<html>
<head>
  <title>Example Shop</title>
</head>
<body>
  <h1>Welcome to this shop!</h1>
  <ul>
    <li><a href="http://example.com/shop/123">computer</a></li>
    <li><a href="http://example.com/shop/987">phone</a></li>
    <li><a href="http://example.com/shop/159">tablet</a></li>
  </ul>
</body>
</html>
```

## Crawler only

Execute the following file with node:

```js
var crawler = require('./path/to/web-crawler/crawler.js');

crawler.process({
  url: 'http://example.com/shop', 
  scripts: [ 'http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js' ],
  extractFunction: function () {
    // will be executed in the page context of the brower
    // with jQuery already loaded/injected
    return {
      title: document.title,
      products: jQuery('ul a').map(function () {
        return { name: this.innerText, url: this.href };
      }).toArray()
    };
  }, 
  callback: function (error, result) {
    if (error) console.log('an error has occured', error);
    else console.log('crawl successful', result);
  }
});
```

Which should display (not in that exact order):

```js
{
  title: 'Example Shop',
  products: [ 
    { name: 'computer', url: 'http://example.com/shop/123' },
    { name: 'phone', url: 'http://example.com/shop/987' },
    { name: 'tablet', url: 'http://example.com/shop/159' } 
  ]
}
```

## Crawler with Web-Server

Start the web server like that (`my-server.js`):

```js
var crawlServer = require('./path/to/web-crawler/crawl-server');

crawlServer.createServer({
  staticBase:  __dirname + '/public',
  crawlerBase: __dirname + '/crawler'
});
```

This will start a web server on port 8000, that uses crawlers in the `crawler` folder and serves static content from `public`.

Then create a crawler (`crawler/my-crawler.js`):

```js
var crawler = require('./path/to/web-crawler/crawler.js');

var extractTitleAndProducts = function () {
  return {
    title: document.title,
    products: jQuery('ul a').map(function () {
      return { name: this.innerText, url: this.href };
    }).toArray()
  };
};

exports.crawl = function (done) {
  crawler.process({
    url: 'http://example.com/shop', 
    scripts: [ 'http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js' ],
    extractFunction: extractTitleAndProducts, 
    callback: done
  });
};
```

This crawler works like the one above but exports a `crawl` function, that takes a callback-function with the arguments error and result. By doing so it fulfills the requirements for a crawler.

The crawler can now be executed at <http://localhost:8000/crawler/my-crawler>, which returns the JSON-encoded crawl-result.

To process and display the crawled data you can add static files (`public/index.html`):

```html
<html>
<head>
  <title>My Results</title>
  <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js">
  </script>
  <script>
    $(function () {
      $.getJSON('/crawler/my-crawler', function(data) {
        $('h1').append('The shop "' + data.title + '" offers:');
        for (var i = 0; i < data.products.length; i++)
          $('ul').append('<li>' + data.products[i].name + '</li>');
      });
    });
  </script>
</head>
<body>
  <h1></h1>  <!-- The shop "X" offers: -->
  <ul></ul>  <!-- list of product names -->
</body>
</html>
```

This page will be available at <http://localhost:8000/index.html>.

# Install

1. Install [node.js]()

  I assume that you have already installed node. If not, [do so now!](https://github.com/joyent/node)

2. Download [PhantomJS]()

  Get a built from their [download page](http://phantomjs.org/download.html) and copy the binary to `/web-crawler/bin/phantomjs`.
  (If you want to change that path, modify `/web-crawler/crawler.js#PHANTOM_BINARY`)

3. Install [node-phantom]()

  That is quite easy with `npm`.
  Because `node-phantom` has a tiny bug you may want to install my fixed version. (Use the official version after the [Pull-Request](https://github.com/alexscheelmeyer/node-phantom/pull/39) has been accepted)

  ```bash
  cd web-crawler
  npm install https://github.com/FelixHoer/node-phantom/tarball/master
  # npm install node-phantom # use this official version when fixed
  ```

# API

## crawler.process(options)

Queues the crawling of given url with extractFunction. The callback will be called with results after data has been extracted.

Options:

  * `url`: String
    The url that should be crawled.

  * `extractFunction`: function()
    This function will be executed in the context of the page, that is referenced by url. It's return value will be the result-parameter of the callback function. 
    Because this function will be executed in the sandboxed brower-environment, no data be closed in or out (with a closure). Also, the return value is limited to about everything that can be serialized via JSON.

  * `callback`: function(error, result)
    This function will either be called if an error occured or after the extractFunction has been executed. The result will be whatever extractFunction has returned.

  * `scripts`: String[]
    The scripts will be injected into the page's context before the extractFunction is executed.
    If a script-path starts with http or https it will be loaded from the server and subsequently injected. Otherwise it will be loaded from the local filesystem.
    This option is optional.


Example:

```js
var crawler = require('./path/to/crawler.js');
crawler.crawl({
  url: 'http://example.com',
  scripts: [ 'http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js' ],
  extractFunction: function () {
    return document.title;
  },
  callback: function (error, result) {
    console.log('crawl-result', error, result);
  }
});
```

## crawl-server.createServer(options)

Creates the web server, that serves static files and provides access to the crawlers.

Options:

  * `staticBase`: String
    This directory will be served as web-root, so all files within will be accessible.
    If it is not provided, no static files will be served.

  * `crawlerBase`: String
    The crawlers in this directory will be accessible under crawlerPublicBase.
    If it is not provided, no crawlers will be accessible.

  * `crawlerPublicBase`: String
    The url under which the crawlers can be accessed. The default is `/crawler`.

  * `port`: Number
    The port on which the server should run. The default is 8000.

Example:

```js
var crawlServer = require('./path/to/crawl-server.js');
crawlServer.createServer({
  staticBase: '/my/project/static-files',
  crawlerBase: '/my/project/crawler-files',
  crawlerPublicBase: '/crawl-data', 
  port: 12000 
});
```

## Crawler Interface (for crawl-server)

To implement a crawler-file, it has to export a `crawl` function (described below).

### crawl(callback)

The crawl function sould somehow acquire data and return it by invoking the callback.

Parameters:

  * callback: function (error, result)
    * error: undefined/null or anything
    * result: anything

    If error is `undefined` or `null`, the crawl function has failed.
    Otherwise result holds the extracted data.

Example: 

```js
var crawler = require('./path/to/crawler.js');

var extractTitle = function () {
  return document.title;
};

exports.crawl = function (callback) {
  crawler.crawl({
    url: 'http://example.com',
    extractFunction: extractTitle,
    callback: function (error, result) {
      callback(error, result);
    }
  });
};
```

# Documentation

The [Annotated Source Code](http://felixhoer.github.com/web-crawler/crawl-server.js.html) is available as Github-Page.

The documentation can be built with [docker](https://github.com/jbt/docker).
If you have it installed run following command:

```bash
docker -o doc *.js
```

# Dependencies

* [node.js]() (tested with 0.8.19) : JavaScript on the server-side
* [PhantomJS]() (tested with 1.9.0) : a headless browser
* [node-phantom]() (tested with 0.2.1): bridge between phantom and node

# License

web-crawler is MIT licensed.

[node.js]: http://nodejs.org/
[PhantomJS]: http://phantomjs.org/
[node-phantom]: https://github.com/alexscheelmeyer/node-phantom