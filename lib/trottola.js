/**
 * Trottola
 *
 * @package trottola
 * @author Daniele Salatti <danielesalatti@gmail.com>
 */
import util from 'util';
import DTimer from '@danielesalatti/node-redis-distributed-timer';

function Trottola(config) {
  if (!(this instanceof Trottola)) {
    return new Trottola(config);
  }
  let conf = null;
  conf = config || {};

  this.limit = 1000; // By default, we accept 1000 requests
  this.timeFrame = 600; // in a 10 minutes time frame (1,6 requests/s)
  this.marked = {};
  this.redisChannel = 'trottola';

  util._extend(this, conf);

  /**
     * If this.redis is undefined, i.e. the user hasn't specified a redis
     * instance, throw.
     */
  if (typeof this.redis === 'undefined') {
    throw new Error('Please, specify a connection to a Redis instance.');
  }
  if (typeof this.redisPub === 'undefined') {
    throw new Error('Please, specify a connection to a Redis instance for pub.');
  }
  if (typeof this.redisSub === 'undefined') {
    throw new Error('Please, specify a connection to a Redis instance for sub.');
  }

  const dt = new DTimer.DTimer(this.redisChannel, this.redisPub, this.redisSub);

  this.confEvents = function () {
    const that = this;
    dt.on('event', (ev) => {
      if (ev.delKey) {
        that.clear(ev.delKey);
      }
    });
    dt.on('error', (err) => {
      throw err;
    });
    dt.join((err) => {
      if (err) {
        throw new Error(`Failed to join the ${that.redisChannel} Redis channel. `);
      }
    });
  };

  this.confEvents();

  /**
     * Checks if the key is available, calls mark to create it otherwise.
     */
  this.availableRequests = function (key, cb) {
    const that = this;
    let record;

    this.redis.get(key, (err, res) => {
      if (res !== null) {
        record = JSON.parse(res);
        const now = (new Date()).getTime() / 1000;
        if ((record.reset - now) < 0) { // This ShouldNeverHappen™, but just in case...
          that.clear(key);
          that.mark(key, (rec) => {
            cb(true, rec);
          });
          return null;
        }
        record.used += 1;
        that.redis.set(key, JSON.stringify(record));
        return cb(record.used < record.limit, record);
      }
      that.mark(key, (rec) => {
        cb(true, rec);
      });
      return null;
    });
  };

  /**
     * Creates the key in the store and sets the timeout for expiry
     */
  this.mark = function (key, cb) {
    const now = (new Date()).getTime() / 1000;
    const record = {
      used: 1,
      reset: now + this.timeFrame,
      limit: this.limit,
    };

    this.redis.set(key, JSON.stringify(record), this.redis.print);

    // Delete the key after the specified amount of time
    dt.post({
      delKey: key,
    }, this.timeFrame * 1000, (err) => {
      if (err) {
        throw new Error('Failed to post an event.');
      }
    });

    cb(record);
  };

  /**
     * Deletes the key from redis or the memory store
     */
  this.clear = function (key) {
    this.redis.del(key);
  };

  return this;
}

export default function getTrottola(config) {
  return Trottola(config);
}
