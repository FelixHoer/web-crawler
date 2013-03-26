# web-crawler

The `web-crawler` allows you to extract data from dynamic web pages in a powerful, jet convenient way. This is possible by using a headless browser, that injects your crawl-code into the running page-context.
It also provides a web-server, that serves crawl-results and static files to process and display the gathered information.

# usage

You can either use only the crawler component in your node.js application, 
or you can also use the web-server component to serve crawl-results and display them with additional static files.

## crawler only

TODO example

## crawler with web-server

TODO example

# install

1. Install [node.js]()

  I assume you have already installed node. If not, [do so now!](https://github.com/joyent/node)

2. Download [PhantomJS]()

  Get a built from their [download page](http://phantomjs.org/download.html) and copy the binary to `/web-crawler/bin/phantomjs`.
  (If you want to change that path, modify `/web-crawler/crawler.js#PHANTOM_BINARY`)

3. Install [node-phantom]()

  That is quite easy with `npm`.

  ```
  cd web-crawler
  npm install node-phantom
  ```

# api

TODO

# dependencies

* [node.js]() (tested with 0.8.19) : JavaScript on the server-side
* [PhantomJS]() (tested with 1.9.0) : a headless browser
* [node-phantom]() (tested with 0.2.1): bridge between phantom and node

# license

web-crawler is MIT licensed.

[node.js]: http://nodejs.org/
[PhantomJS]: http://phantomjs.org/
[node-phantom]: https://github.com/alexscheelmeyer/node-phantom