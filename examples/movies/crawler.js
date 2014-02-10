// Author: Felix Hoerandner (2014)

var sm = require('../../lib/sm');
var u  = require('../../lib/util');

var CINEMA_URL = 'http://localhost:10000/';
var DB_URL     = 'http://localhost:10001/';

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

var performSearch = function (term) {
  jQuery('#search input[type=text]').val(term);
  var submit = jQuery('#search input[type=submit]').get(0);

  var ev = document.createEvent('MouseEvents');
  ev.initEvent('click', true, true);
  submit.dispatchEvent(ev);
};

var search = function (context, done) {
  context.titleIndex = context.titleIndex || 0;
  if (context.titleIndex >= context.titles.length)
    return done('no title left');

  var term = context.titles[context.titleIndex];
  context.titleIndex++;

  u.execute(performSearch, term)(context, done);
};

var extractMovieFunction = function () {
  return {
    title: jQuery('#result h2').text(),
    description: jQuery(jQuery('#result p').get(1)).text(),
    genres: jQuery('#result li').map(function () {
      return jQuery(this).text();
    }).toArray()
  };
};

var storeMovieFunction = function (context, data) {
  context.data = context.data || [];
  context.data = context.data.concat(data);
};

var machine = {
  "initial": {
    transitions: { "undefined": "Cinema-Page" }
  },

  "Cinema-Page": {
    "initial": {
      onentry: u.createPage,
      transitions: { "undefined": "loadPage" }
    },
    "loadPage": {
      onentry: u.loadPage(CINEMA_URL),
      transitions: { "loaded": "waitForData" }
    },
    "waitForData": {
      onentry: u.wait(1000),
      transitions: { "waited": "extractData" }
    },
    "extractData": {
      onentry: u.extractData(storeTitleFunction, extractTitleFunction),
      transitions: { "undefined": "clickOnNext" }
    },
    "clickOnNext": {
      onentry: u.execute(clickOnNext),
      transitions: { "next": "waitForData", "no next": "final" }
    },
    "final": { transitions: { "undefined": "DB-Page" } }
  },

  "DB-Page": {
    "initial": {
      onentry: u.createPage,
      transitions: { "undefined": "loadPage" }
    },
    "loadPage": {
      onentry: u.loadPage(DB_URL),
      transitions: { "loaded": "search" }
    },
    "search": {
      onentry: search,
      transitions: { "undefined": "waitForData", "no title left": "final" }
    },
    "waitForData": {
      onentry: u.wait(700),
      transitions: { "waited": "extractData" }
    },
    "extractData": {
      onentry: u.extractData(storeMovieFunction, extractMovieFunction),
      transitions: { "undefined": "search" }
    },
    "final": { transitions: { "undefined": "final" } }
  },

  "final": {}
};

var crawler = sm.createStateMachine(machine);
crawler({}, function (event, context) {
  console.log(event, context);

  if (context.data)
    console.log(JSON.stringify(context.data));

  phantom.exit();
});
