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

So how would we extract all movie titles of this site? Let's just do as we would while viewing in a browser. Open the browser (`createPage`), go to the cinema site (`loadPage`), wait until it is done loading (`waitForData`) and take in the information of the current page (`extractData`). If there is a "next" button, we would click it (`clickOnNext`) and then we would have to wait again until it is loaded (`waitForData`). Otherwise, if there is no "next" button, we would have seen all pages, and we would be done (`final`). These natural steps can easily be transformed into a state machine. The corresponding **crawler-script** could be implemented as follows:

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

And how could I use the crawling capabilities from my favorite language? A crawler can easily be exposed as a web service. Then you just send a HTTP request to trigger it. See the `examples` folder on how to implement this.

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

## State Machine (sm.js)

In general, a state machine consists of one start state, transitions between the states and at least one final state. In this implementation when a state is entered, a function is called (`onentry`). If there are multiple outgoing transitions from a state, one can be selected by the output of the `onentry` function. For convenience, there is always a default transition to the next state in the list, that is taken if no other transition matches.

### State

A state is represented as a object with the following keys:

* `name` `String` (optional): a name for the state.
* `onentry` `function(context, done)` (optional): this function is called when the state machine transitions into this state.
  * `context` `any type`: a context object, as described below.
  * `done` `function(event)`: a function that has to be called in the onentry-function to signify that the function has fulfilled it's purpose.
* `transitions` `[]`: an array of transition-objects, which may look as follows: `[event, state-name]`. The first parameter supplied to the `onentry`'s `done` function is matched with `event`. If a match is found, the state machine transitions to a state with the given `state-name`.

### Context

The context is a way to share data between the states of the state machine. It is initially provided by the user when starting the state machine. Each `onentry` function will receive the same object. They can access data stored in it by previous states, or add data that was generated in the current call. After the state machine terminated, the context object will be provided to the state machine's callback.

### sm.machine(states)

**Parameters**:

* `states` `[]`: an array of State-objects, as described above.
  
**Returns** `function(context, callback)`: The state machine is started by calling this function.

* `context` `any type`: a context object, as described below.
* `callback` `function(event, context)`: This function is called after the final state has been processed.
  * `event`: the event emitted from the last state
  * `context`: the initially provided context-object. It should now be populated with the extracted data.

**Algorithm**:

1. The state machine starts with the first state in the `states` array.
2. The `onentry` function of that state is looked up.
  1. If there is an `onentry`-function, it is called. The user-provided function does it's work (like starting to load a page). Once it is done, it emits an event by calling the `done`-function with the event as first parameter (like loading was successful).
  2. If there is no `onentry`-function, a event of `undefined` is emitted.
3. The `transitions` array of the current state is looked up.
  1. If there is a `transitions` array, the event is used to look up transition.
    1. If there is a matching transition, the machine transitions into a state with the given name.
    2. Otherwise, the state machine transitions to the next state in the states array.
  2. If there is no `transitions` array, the state machine transitions to the next state in the `states` array.
4. The state that was transitioned to is now the current state and executed as described in 2.
5. If the last state in the states array was executed and the state machine tries to execute the (not existing) next state, it terminates. Then the machine's `callback`-function is invoked with an event of "exit".
6. If there was an error during a state execution, such as an exception or an not found state-name, the machine's `callback`-function is called with an event of "error" or "not-found".

### sm.submachine(properties, states)

This function encapsulates a whole state-machine into a single state. This makes it easier to compose more complex machines from simpler ones.

**Parameters**:

* `properties`: a state object as described above. It's `onentry` will be overwritten with one, that performes the algorithm on it's child `states`.
* `states` `[]`: an array of state objects as described above.

**Returns**: a state object.

## Utilities (util.js)

### u.createPage(context, done)

This function acts as an `onentry` function of a state. It creates a phantomjs web page and stores it in `context.page`. Then it calls `done` with an event of `undefined`.

### u.loadPage(url)

This function returns an `onentry` function of a state. It navigates the phantomjs web page (`context.page`) to the given url. A `loaded` is emitted via the `onentry`-function's `done`, if the navigation succeeded. Otherwise an `error` is emitted.

### u.injectScripts(scripts)

This function returns an `onentry` function of a state. It takes an array of URLs that point to remote or local javascript files. Those are injected into the phantomjs web page (`context.page`) one after the other. A `injected` is emitted via the `onentry`-function's `done`, if the scripts were injected successfully. Otherwise an `error` is emitted.

### u.extractData(storeFun, fun, args)

This function returns an `onentry` function of a state. It executes the given function `fun` with the arguments `args` in the context of the phantomjs page (`context.page`). Whatever is returned by that function is passed as the second parameter to the function `storeFun` (`function(context, data)`). A `undefined` is emitted via the `onentry`-function's `done`.

### u.execute(fun, args)

This function returns an `onentry` function of a state. It behaves like `u.extractData`, but it does not use a `storeFun`. Instead the data extracted from the page is emitted via the `onentry`-function's `done`.

### u.navigate(fun, args)

This function returns an `onentry` function of a state. It executes the given function `fun` with the arguments `args` in the context of the phantomjs page (`context.page`). That function should trigger some navigation, such as a click on a link. A `loaded` is emitted via the `onentry`-function's `done`, once the page is done loading.

### u.wait(time)

This function returns an `onentry` function of a state. After `time` milliseconds, a `weited` is emitted via the `onentry`-function's `done`.

### u.waitUntilLoaded()

This function returns an `onentry` function of a state. A `loaded` is emitted via the `onentry`-function's `done`, once the page is done loading.

### u.serve(crawler, port)

This function starts a webserver that listens to the given `port`. Every time a HTTP request is received, the state machine given by `crawler` is triggered. The GET and POST parameters supplied via the request are available through `context.getParams` and `context.postParams`. Whatever is under `context.data` when the crawler terminates will be sent back in the HTTP response in JSON format. The `serve` function returns a `function()` that will close the server when called.

# Dependencies

* [PhantomJS](PhantomJS) (tested with 1.9.8) : a headless browser

# License

The `web-crawler` is MIT licensed.

[PhantomJS]: http://phantomjs.org/
