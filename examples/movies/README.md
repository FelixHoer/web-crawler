# Movie Example

In this example data from two dynamic websites is harvested.

1. The Cinema Site: shows movie titles on different pages.
2. The Movie Database Site: provides a search-interface to get additional information, such as a description and the genres, for a movie.

The crawler retrieves all movie titles from the Cinema Site and looks up their details through the Movie Database Site. With this data a recommendation based on the user's favorite genres could be made.

## Run

1. Serve the Cinema Site on Port 10000:
```
cd examples/movies/Cinema-Site
python -m SimpleHTTPServer 10000

```

2. Serve the Movie Database Site on Port 10001:
```
cd examples/movies/Movie-Database-Site
python -m SimpleHTTPServer 10001

```

3. Start the Crawler:
```
bin/phantomjs examples/movies/crawler.js
```
