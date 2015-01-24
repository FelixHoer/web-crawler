# Examples

## Prerequisite: Serve Pages

The examples require you to serve the pages that should be crawled on port 10000. You can do so by running the following commands:

```bash
cd examples/pages
python -m SimpleHTTPServer 10000
```

## Simple Shop Example (extract-shop-items.js)

In this example data from a static site is collected.
The crawler loads the page, injects JQuery and uses it to conveniently extract all relevant data. Run it with:

```bash
cd examples
/path/to/bin/phantomjs extract-shop-items.js
```

## Movie Titles Example 

This example shows you how to deal with dynamic paginated webpages. The movies of the local cinema shows the titles of today's movies. This list is paginated and new pages are loaded via AJAX calls. Run it with:

```bash
cd examples
/path/to/bin/phantomjs extract-movie-titles.js
```

## Detailed Movies Example (extract-movies.js)

In this example data from two dynamic websites is harvested.

1. The Cinema Site: shows movie titles on different pages.
2. The Movie Database Site: provides a search-interface to get additional information, such as a description and the genres, for a movie.

The crawler retrieves all movie titles from the Cinema Site and looks up their details through the Movie Database Site. With this data a recommendation based on the user's favorite genres could be made. Run it with:

```bash
cd examples
/path/to/bin/phantomjs extract-movies.js
```