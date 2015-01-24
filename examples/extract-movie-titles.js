// Author: Felix Hoerandner (2015)

var sm = require('../lib/sm');
var u  = require('../lib/util');

var CINEMA_URL = 'http://localhost:10000/cinema/';

var extractTitleFunction = function () {
  var movies = jQuery('#movies li').map(function () {
    return $(this).text();
  }).toArray();

  return movies;
};

var storeTitleFunction = function (context, data) {
  context.titles = context.titles || [];
  context.titles = context.titles.concat(data);
};

var clickOnNext = function () {
  var el = jQuery('#paginator a:contains("next")').get(0);
  if (!el)
    return 'no next';

  var ev = document.createEvent('MouseEvents');
  ev.initEvent('click', true, true);
  el.dispatchEvent(ev);
  return 'next';
};

var crawler = sm.machine([
  {
    name: "createPage",
    onentry: u.createPage
  },
  {
    name: "loadPage",
    onentry: u.loadPage(CINEMA_URL)
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
      ["next", "waitForData"],
      ["no next", "final"]
    ]
  },
  { name: "final" }
]);

// run the crawler
crawler({}, function (event, context) {
  console.log(event, context);

  if (context.titles)
    console.log(JSON.stringify(context.titles));

  phantom.exit();
});
