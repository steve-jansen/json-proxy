var helper = require('./shared/setup.js'),
    suites = require('./shared/suites.js'),
    async  = require('async'),
    util   = require('util');

describe('the proxy server', function() {
  context('using a basic config', function() {
    var config = {},
        proxyPort;

    before(function(done) {
      helper.setup(config, function(err, port) {
        if (err) throw err;
        proxyPort = port;
        done();
      });
    });

    // needed to setup the shared context for the proxyPort and tempDir
    beforeEach(function(done) {
      this.proxyPort = proxyPort;
      done();
    })

    suites.run();

    after(function(done) {
     helper.cleanup(done);
    })
  });

  context('using another LAN proxy server', function() {
    var proxyPort;

    before(function(done) {
      helper.setup({ useLanProxy: true }, function(err, port) {
        if (err) throw err;
        proxyPort = port;
        done();
      });
    });

    // needed to setup the shared context for the proxyPort and tempDir
    beforeEach(function(done) {
      this.proxyPort = proxyPort;
      done();
    })

    suites.run();

    after(function(done) {
     helper.cleanup(done);
    })
  });

  after(function(){
    var nock = require('nock');
    nock.enableNetConnect();
    nock.restore();
  })
})
