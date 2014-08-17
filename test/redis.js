var expect = require("chai").expect;
var redis = require("redis");
var client = redis.createClient();
var clientSub = redis.createClient();
var trottola = require("../index");



describe("Trottola", function(){

   describe("#Trottola(config)", function(){
       it("should return an object of type Trottola, with the specified limit" +
            " and timeFrame properties", function(){
           var result = trottola({
               limit: 50,
               timeFrame: 600,
               redis: client,
               redisPub: client,
               redisSub: clientSub
           });
           expect(result).to.be.an('object');
           expect(result.limit).to.equal(50);
           expect(result.timeFrame).to.equal(600);
       });
   });

    describe("#availableRequests(key)", function(){
        it("should return ready = true", function(done){
            var result = trottola({
                limit: 50,
                timeFrame: 600,
                redis: client,
                redisPub: client,
                redisSub: clientSub
            });

            result.availableRequests("testKey", function(ready, used, limit, reset) {
                if (ready) done();
                else done(new Error('Request is getting throttled'));
            });

        });
    });

    describe("#clear(key)", function(){
        it("should remove the key", function(done){
            var result = trottola({
                limit: 50,
                timeFrame: 600,
                redis: client,
                redisPub: client,
                redisSub: clientSub
            });
            result.availableRequests("testKey", function(ready, used, limit, reset) {
                result.clear("testKey");
                try {
                    expect(result.marked["testKey"]).to.be.undefined;
                    done();
                } catch(e) {
                    done(e);
                }
            });
        });
    });

    describe("#availableRequests(key)", function(){
        it("should create the key", function(done){
            var result = trottola({
                limit: 50,
                timeFrame: 600,
                redis: client,
                redisPub: client,
                redisSub: clientSub
            });

            result.availableRequests("testKey", function(ready, record) {
                try {
                    expect(client.get("testKey")).to.not.be.undefined;
                    done();
                } catch(e) {
                    done(e);
                }
            });
        });
    });

    describe("#availableRequests(key)", function(){
        it("should increase the count key", function(done){
            var result = trottola({
                limit: 50,
                timeFrame: 600,
                redis: client,
                redisPub: client,
                redisSub: clientSub
            });
            result.clear("testKey2");
            result.availableRequests("testKey2", function(ready, record) {
                result.availableRequests("testKey2", function(ready, record) {
                    try {
                        expect(record.used).to.equal(2);
                        done();
                    } catch(e) {
                        done(e);
                    }
                });
            });
        });
    });

});
