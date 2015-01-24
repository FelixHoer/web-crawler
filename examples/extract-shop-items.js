// Author: Felix Hoerandner (2014)

var sm = require('../lib/sm');
var u  = require('../lib/util');

var SHOP_URL   = 'http://localhost:10000/simple-shop/';
var JQUERY_URL = 'http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js';

var extractFunction = function () {
  return jQuery('#items li').map(function () {
    return {
      name:  jQuery(this).find('a').text(),
      link:  jQuery(this).find('a').get(0).href,
      price: jQuery(this).find('span').text()
    };
  }).toArray();
};

var storeFunction = function (context, data) {
  context.data = data;
};

var crawler = sm.machine([
  {
    name: "createPage",
    onentry: u.createPage
  },
  {
    name: "loadPage",
    onentry: u.loadPage(SHOP_URL)
  },
  {
    name: "injectJQuery",
    onentry: u.injectScripts([JQUERY_URL])
  },
  {
    name: "extractData",
    onentry: u.extractData(storeFunction, extractFunction)
  }
]);

crawler({}, function (event, context) {
  console.log(event, context);

  if (context.data)
    console.log(JSON.stringify(context.data));

  phantom.exit();
});
