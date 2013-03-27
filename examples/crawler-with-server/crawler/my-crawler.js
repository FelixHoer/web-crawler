var crawler = require('../../../crawler.js');

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
    url: 'http://localhost:12000/shop.html', 
    scripts: [ 'http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js' ],
    extractFunction: extractTitleAndProducts, 
    callback: done
  });
};