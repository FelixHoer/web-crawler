var crawler = require('../../crawler.js');

crawler.process({
  url: 'http://localhost:12000/shop.html', 
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