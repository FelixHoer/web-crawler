# Simple Shop Example

In this example data from a static site is collected.
The crawler loads the page, injects JQuery and uses it to conveniently extract all relevant data.

## Run

1. Serve the Shop Site on Port 9000:
```
cd examples/simple-shop
python -m SimpleHTTPServer 9000

```

2. Start the Crawler:
```
bin/phantomjs examples/simple-shop/crawler.js
```
