import Promise from 'bluebird';
import redis from 'redis';
import chai from 'chai';
import getTrottola from '../index.js';

const red = Promise.promisifyAll(redis);

const client = red.createClient();
const clientSub = red.createClient();

const { expect } = chai;

describe('Trottola', () => {
  describe('#Trottola(config)', () => {
    it('should return an object of type Trottola, with the specified limit'
            + ' and timeFrame properties', () => {
      const result = getTrottola({
        limit: 50,
        timeFrame: 600,
        redis: client,
        redisPub: client,
        redisSub: clientSub,
      });
      expect(result).to.be.an('object');
      expect(result.limit).to.equal(50);
      expect(result.timeFrame).to.equal(600);
    });
  });

  describe('#availableRequests(key)', () => {
    it('should return ready = true', (done) => {
      const result = getTrottola({
        limit: 50,
        timeFrame: 600,
        redis: client,
        redisPub: client,
        redisSub: clientSub,
      });

      result.availableRequests('testKey', (ready) => {
        if (ready) done();
        else done(new Error('Request is getting throttled'));
      });
    });
  });

  describe('#clear(key)', () => {
    it('should remove the key', (done) => {
      const result = getTrottola({
        limit: 50,
        timeFrame: 600,
        redis: client,
        redisPub: client,
        redisSub: clientSub,
      });
      result.availableRequests('testKey', () => {
        result.clear('testKey');
        try {
          expect(typeof result.marked.testKey).to.equal('undefined');
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('#availableRequests(key)', () => {
    it('should create the key', (done) => {
      const result = getTrottola({
        limit: 50,
        timeFrame: 600,
        redis: client,
        redisPub: client,
        redisSub: clientSub,
      });

      result.availableRequests('testKey', () => {
        try {
          expect(typeof client.get('testKey')).to.not.equal('undefined');
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('#availableRequests(key)', () => {
    it('should increase the count key', (done) => {
      const result = getTrottola({
        limit: 50,
        timeFrame: 600,
        redis: client,
        redisPub: client,
        redisSub: clientSub,
      });
      result.clear('testKey2');
      result.availableRequests('testKey2', () => {
        result.availableRequests('testKey2', (_, record) => {
          try {
            expect(record.used).to.equal(2);
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    });
  });
});
