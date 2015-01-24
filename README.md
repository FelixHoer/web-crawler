# web-crawler

The `web-crawler` allows you to extract data from dynamic web pages in a powerful, yet convenient way. This is possible by using [PhantomJS]() - a headless browser - which injects your crawl-code into running pages. To handle complex scenarios the sequence of operations is expressed as a state machine.

# Usage

Consider a dynamic paginated web page of your local cinema. It's HTML could look like that:

```html
<html>
<head>
  <title>The Local Cinema</title>
  <script>
    // a script that performs AJAX requests to dynamically load
    // and display new pages, depending on the users clicks
  </script>
</head>
<body>

  <h1>The Local Cinema - Today's Program</h1>

  <ul id="movies">
    <li>Ride Along</li>
    <li>Frozen</li>
    ...
  </ul>

  <div id="paginator">
    <span>1</span>
    <a href="#">next</a>
  </div>

</body>
</html>
```

A crawler-script to extract all movie titles could be implemented as follows:

```javascript
// load dependencies
var sm = require('../lib/sm');
var u  = require('../lib/util');

// helper functions

var extractTitleFunction = function () { 
  // executed in page's context
  // find html elements that contain the title and extract it
  return jQuery('#movies li').map(function () {
    return $(this).text();
  }).toArray();
};

var storeTitleFunction = function (context, data) {
  // add the found movie titles to the already existing (in context)
  context.titles = context.titles || [];
  context.titles = context.titles.concat(data);
};

var clickOnNext = function () {
  // executed in page's context
  // find next button ...
  var el = jQuery('#paginator a:contains("next")').get(0);
  if (!el)
    return 'no next';

  // ... and click it
  var ev = document.createEvent('MouseEvents');
  ev.initEvent('click', true, true);
  el.dispatchEvent(ev);
  return 'next'; // the state's return can select a transition
};

// define the crawler state machine
var crawler = sm.machine([
  {
    name: "createPage",
    onentry: u.createPage
  },
  {
    name: "loadPage",
    onentry: u.loadPage('http://localhost:10000/cinema/')
  },
  {
    name: "waitForData",
    onentry: u.wait(1000)
  },
  {
    name: "extractData",
    onentry: u.extractData(storeTitleFunction, extractTitleFunction)
  },
  {
    name: "clickOnNext",
    onentry: u.execute(clickOnNext),
    transitions: [
      ["next", "waitForData"], // another page exists? transition to previous state
      ["no next", "final"]
    ]
  },
  { name: "final" }
]);

// run the crawler
crawler({}, function (event, context) {
  console.log(JSON.stringify(context.titles));
  phantom.exit();
});
```

# Install

1. Download [PhantomJS]()

  Get a build from their [download page](http://phantomjs.org/download.html).

2. Run your script

  ```bash
  /path/to/bin/phantomjs your-script.js
  ```

# API

TODO

# Dependencies

* [PhantomJS]() (tested with 1.9.7) : a headless browser

# License

The `web-crawler` is MIT licensed.

[PhantomJS]: http://phantomjs.org/
