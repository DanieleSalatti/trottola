Trottola
=========

![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)

A small library providing throttling methods

## Installation

  npm install trottola --save

## Usage

```javascript
  var trottola = require('trottola');  
  var redis = require('redis');

  var client = redis.createClient();        // Used to store client information
  var clientPub = redis.createClient();     // Used internally to set the throttling event timer
  var clientSub = redis.createClient();     // Used internally to be notified of the throttling event


  throttler = trottola({
                limit: 50,
                timeFrame: 600,
                redis: client,
                redisPub: clientPub,
                redisSub: clientSub
            });

  this.throttler.availableRequests("test", function(available, result) {

    var now = (new Date()).getTime() / 1000;

    console.log('limit: ' + result.limit);
    console.log('used: ' + result.used);
    console.log('reset: ' + result.reset);


    if (!available) {
        // Request limit reached
    } else {
        // Request limit not reached
    }

    console.log("reset in " + Math.round(result.reset - now));
  }
```

## Tests

  npm test

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 0.1.3 - Fix: adapting the code to an API change in dtimer
* 0.1.2 - Updated dtimer to fix an issue with Redis connections
* 0.1.1 - README.md fix
* 0.1.0 - Initial release
