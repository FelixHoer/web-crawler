# web-crawler

The `web-crawler` allows you to extract data from dynamic web pages in a powerful, yet convenient way. This is possible by using [PhantomJS]() - a headless browser - which injects your crawl-code into running pages. To handle complex scenarios the sequence of operations is expressed as a state machine.

# Usage

Consider a dynamic **paginated web page** of your local cinema. It's HTML could look like that:

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
    <a href="#">previous</a>
    <span>2</span>
    <a href="#">next</a>
  </div>

</body>
</html>
```

So how would we extract all movie titles of this site? Let's just do as we would while viewing in a browser. Open the browser (`createPage`), go to the cinema site (`loadPage`), wait until it is done loading (`waitForData`) and take in the information of the current page (`extractData`). If there is a "next" button we would click (`clickOnNext`) it and then we would have to wait again until it is loaded (`waitForData`). Otherwise, if there is no "next" button, we would have seen all pages, and we would be done (`final`). These natural steps can easily be transformed into a state machine. The corresponding **crawler-script** could be implemented as follows:

```javascript
// load dependencies
var sm = require('../lib/sm');
var u  = require('../lib/util');

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
    onentry: u.extractData(
      // second: store extracted data, concat into existing context
      function (context, data) { 
        context.titles = context.titles || [];
        context.titles = context.titles.concat(data);
      }, 
      // first: extract titles, executed in page's context
      function () { 
        return jQuery('#movies li').map(function () {
          return $(this).text();
        }).toArray();
      })
  },
  {
    name: "clickOnNext",
    onentry: u.execute(function () { // executed in page's context
      // find next button ...
      var element = jQuery('#paginator a:contains("next")').get(0);
      if (!element)
        return 'no next';

      // ... and click it
      var event = document.createEvent('MouseEvents');
      event.initEvent('click', true, true);
      element.dispatchEvent(event);
      return 'next'; // the state's return can select a transition
    }),
    transitions: [
      ["next", "waitForData"], // transition to previous state if next button exists
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

This will print the titles of all movies gathered from the individual pages of the cinema site. It wasn't that painful even though parts of the page were dynamically created and updated.

But don't you also want to know more details, such as the movie's description or it's genres? See the `examples` folder how you could include a lookup at a movie-database to also extract that information.

# Install

1. Download [PhantomJS](PhantomJS)

  Get a build from their [download page](http://phantomjs.org/download.html).

2. Get the `web-crawler` scripts

  ```bash
  git clone https://github.com/FelixHoer/web-crawler.git
  ```

3. Run your script that uses the `web-crawler`

  ```bash
  /path/to/bin/phantomjs your-script.js
  ```

# API

TODO

# Dependencies

* [PhantomJS](PhantomJS) (tested with 1.9.7) : a headless browser

# License

The `web-crawler` is MIT licensed.

[PhantomJS]: http://phantomjs.org/
