var helper = require('./shared/setup.js'),
    suites = require('./shared/suites.js');

var scenarios = [
  { context: 'using direct connections to endpoints', connection: 'direct' },
  { context: 'via a downstream proxy', connection: 'proxy' },
  { context: 'via a downstream non-RFC proxy', connection: 'not-rfc-proxy' }
];

describe('the proxy server', function() {
  scenarios.forEach(function(scenario) {
    context(scenario.context, function() {
      var  proxyPort;

      before(function(done) {
        helper.setup(scenario.connection, function(err, port) {
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
  });

  after(function(done) {
    var nock = require('nock');
    nock.enableNetConnect();
    nock.cleanAll();
    nock.restore();
    done();
  })
})

