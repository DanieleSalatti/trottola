/**
 * Trottola
 *
 * @package trottola
 * @author Daniele Salatti <danielesalatti@gmail.com>
 */

function Trottola(config) {
    var util = require('util');
    var DTimer = require('dtimer').DTimer;

    if (!(this instanceof Trottola)) {
      return new Trottola(config);
    }

    config = config || {};

    this.limit = 1000;      // By default, we accept 1000 requests
    this.timeFrame = 600;   // in a 10 minutes time frame (1,6 requests/s)
    this.marked = {};
    this.redisChannel = "$SYS/trottola";

    util._extend(this, config);

    /**
     * If this.redis is undefined, i.e. the user hasn't specified a redis
     * instance, throw.
     */
    if (typeof this.redis === "undefined") {
        throw new Error("Please, specify a connection to a Redis instance.");
    }
    if (typeof this.redisPub === "undefined") {
        throw new Error("Please, specify a connection to a Redis instance for pub.");
    }
    if (typeof this.redisSub === "undefined") {
        throw new Error("Please, specify a connection to a Redis instance for sub.");
    }

    var dt = new DTimer(this.redisChannel, this.redisPub, this.redisSub)

    this._confEvents = function() {
        var that = this;
        dt.on('event', function (ev) {
            if (ev.delKey) {
                that.clear(ev.delKey);
            }
        });
        dt.on('error', function (err) {
            throw err;
        });
        dt.join(function (err) {
            if (err) {
                throw new Error("Failed to join the " + that.redisChannel + " Redis channel.");
            }
        });
    }

    this._confEvents();

    /**
     * Checks if the key is available, calls mark to create it otherwise.
     */
    this.availableRequests = function(key, cb) {

        var that = this,
            record;

        this.redis.get(key, function(err, res) {
            if (res !== null) {
                record = JSON.parse(res);
                var now = (new Date()).getTime() / 1000;
                if ((record.reset - now) < 0) { // This ShouldNeverHappen™, but just in case...
                    that.clear(key);
                    that.mark(key, function(record) {
                        cb(true, record);
                    });
                    return;
                }
                record.used++;
                that.redis.set(key, JSON.stringify(record));
                return cb(record.used < record.limit, record);
            }
            that.mark(key, function(record) {
                cb(true, record);
            });
        });

    };

    /**
     * Creates the key in the store and sets the timeout for expiry
     */
    this.mark = function(key, cb) {

        var now = (new Date()).getTime() / 1000,
            record = {
                used: 1,
                reset: now + this.timeFrame,
                limit: this.limit
            };

        this.redis.set(key, JSON.stringify(record), this.redis.print);

        // Delete the key after the specified amount of time
        dt.post({
                delKey: key
            }, this.timeFrame * 1000, function (err) {
            if (err) {
                throw new Error("Failed to post an event.");
                return;
            }
        });

        cb(record);
    };

    /**
     * Deletes the key from redis or the memory store
     */
    this.clear = function(key) {
        this.redis.del(key);
    };

    return this;
}

module.exports = function(config) {
    return Trottola(config);
};
