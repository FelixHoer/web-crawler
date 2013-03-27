# Examples

## Serve the example shop

This will be the page, that is crawled.
Serve the `example-shop` directory on port `12000` with your favorite webserver.
If you have python installed you can do this with following commands:

```bash
cd example-shop
python -m SimpleHTTPServer 12000
```

So the `shop.html` should be available at <http://localhost:12000/shop.html>.

## Crawler only

This example requires that the example shop is accessible.
To start the example run following commands:

```bash
cd crawler-only
node my-crawler.js
```

The crawl-result should appear in your console.

## Crawler with web-server

This example requires that the example shop is accessible.
To start the example run following commands:

```bash
cd crawler-with-server
node my-server.js
```

Then point your browser at <http://localhost:8000/index.html>.
You can also try <http://localhost:8000/crawler/my-crawler> to see the JSON-encoded crawl-result.