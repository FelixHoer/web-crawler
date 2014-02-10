// Author: Felix Hoerandner (2014)

var sm = require('../../lib/sm');
var u  = require('../../lib/util');

var CINEMA_URL = 'http://localhost:10000/';

var extractFunction = function () {
  var movies = jQuery('#movies li').map(function () {
    return $(this).text();
  }).toArray();

  return movies;
};

var storeFunction = function (context, data) {
  context.data = context.data || [];
  context.data = context.data.concat(data);
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
      onentry: u.extractData(storeFunction, extractFunction),
      transitions: { "undefined": "clickOnNext" }
    },
    "clickOnNext": {
      onentry: u.execute(clickOnNext),
      transitions: { "next": "waitForData", "no next": "final" }
    },
    "final": { transitions: { "undefined": "final" } }
  },
  "final": {}
};

var crawler = sm.createStateMachine(machine);
crawler({}, function (event, context) {
  console.log(event, context);

  if (context.data)
    for (var i = 0; i < context.data.length; i++)
      console.log(context.data[i]);

  phantom.exit();
});
