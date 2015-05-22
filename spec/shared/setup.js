/**
 * Reusable code for setup and teardown of the reusable specs
 * for testing the proxy code.
 */
var fs      = require('fs'),
    path    = require('path'),
    http    = require('http'),
    tmp     = require('tmp'),
    nock    = require('nock'),
    async   = require('async'),
    express = require('express'),
    app     = express(),
    proxy   = require('../../lib/proxy');

// global variable to track handles to open ports to be closed
var handles;

// global variable to track nock rules to assert at the end of a suite
var rules;

/**
 * Initializes the testing infrastructure needed for
 * verifying the behavior of the core proxy library -
 * nock, express, and httpServer.
 *
 * @param  {String}   connection one of 'direct', 'proxy', or 'non-rfc-proxy'
 * @param  {Function} done    the async callback
 */
function setup(connection, done) {
  var config = createDefaultConfig(),
      options = {
        proxy: false,
        headers: {}
      };

  // reset the global variable with handles to port numbers
  handles = {};

  if (connection !== 'direct') {
    options.proxy = true;
 
    config.proxy.gateway = {
      protocol: 'http:',
      host: 'localhost',
      port: 0,
      auth: 'proxyuser:C0mp13x_!d0rd$$@P!'
    };

    // optionally test a non-RFC proxy that expects explicit values
    // for the  Via and/or Host request headers
    if (connection === 'non-rfc-proxy') {
      config.proxy.headers['Via'] = 'http://jedi.example.com';
      config.proxy.headers['Host'] = 'force.example.com';
    }

    // the config map will be mutated by the json-proxy library, so clone it
    options.headers = require('util')._extend(config.proxy.headers);

    configureLanProxy(options, config, function() {
      configureNock(options, config);
      configureExpress(config, done);
    })
  } else {
    configureNock(options, config);
    configureExpress(config, done);
  }
}

/**
 * Returns a default json-proxy config object for the reusable test suites.
 */
function createDefaultConfig() {
  /* HACK: mocha runs tests in parellel, so we have to force ignoring of env variables
  by explicity setting all config items to be non-null */
  return {
    server: {},
    proxy: {
      gateway: {},
      forward: {
        '/api/': 'http://api.example.com',
        '/rewrite/v1/(.*)': 'http://rewrite.example.com/$1',
        '/rewrite/v2/(.*)/unwanted_token/(.*)': 'http://rewrite.example.com/$1/$2',
        '/junction/': 'http://www.example.com/subapp',
        '/remote-api/(.*)': 'https://api.example.biz/$1',
        '/foo/\\d+/bar': 'http://www.example.com/',
        '/user/(\\d+)/email/(\\S+)\?(.*)': 'http://api.example.com/account?id=$1&email=$2&sort=asc',
        '/secure/': 'https://secure.example.com',
        '/dns-error/': 'https://notfound.example.com',
        '/pull/15/(.*)': 'https://authorization.example.com/$1'
      },
      headers: {
        'X-Test-Header': 'John Doe',
        'X-Test-Header-Function': function(req) {
          if (req.url === '/pull/15/token') {
            return 'Bearer 0123456789abcdef';
          }
        }
      }
    }
  };
}

/**
 * configures nock globally for a test run
 *
 * @param  {Object.<string, string>} options  the options for configuring this
 *                                            test suite
 * @param  {Object.<string, string>} config   the config of the json-proxy for
 *                                            this test suite
 * @returns {Array}  an array of configured nock instances
 */
function configureNock(options, config) {
  var result = {};
  // deny all real net connections except for localhost
  nock.disableNetConnect();
  nock.enableNetConnect('localhost');

  function createNock(url) {
    var instance = nock(url),
        expectedViaHeader = options.headers['Via'] ||
                            'http://localhost:' + config.proxy.gateway.port,
        expectedHostHeader = options.headers['Host'] || /.*/;

    if (options.proxy === true) {
      // verify that the request was actually proxied
      // optionally support downstream proxies with non-RFC expectations on
      // the Host and Via request headers
      instance.matchHeader('via', expectedViaHeader);
      instance.matchHeader('host', expectedHostHeader);
    }

    // verify the injected header
    instance.matchHeader('x-test-header', 'John Doe');

    return instance;
  }

  rules = [
    createNock('http://api.example.com')
    .get('/api/hello')
    .reply(200, '{ "hello": "world" }')
    .get('/account?id=1&email=2&sort=asc')
    .reply(200, '{ "email": "john.doe@example.com" }')
    .get('/api/notfound')
    .reply(404),

    createNock('http://rewrite.example.com')
    .get('/hello')
    .reply(200, '{ "hello": "world" }')
    .get('/foo/bar')
    .reply(200, '{ "foo": "bar" }'),

    createNock('http://www.example.com')
    .get('/foo/12345/bar')
    .reply(200, '{ "foo": "bar" }')
    .get('/subapp/junction/customer/1')
    .reply(200, '{ "id": 1 }'),

    createNock('https://api.example.biz')
    .get('/issue/8')
    .reply(200, '{ "reporter": "@heygrady" }'),

    createNock('https://secure.example.com')
    .get('/secure/api/hello')
    .reply(200, '{ "hello": "world" }')
    .get('/secure/api/notfound')
    .reply(404),

    createNock('https://authorization.example.com')
    .matchHeader('X-Test-Header-Function', 'Bearer 0123456789abcdef')
    .get('/token')
    .reply(200, '{ "author": "ehtb" }')
  ];
}

/**
 * Configures an express instance on a dynamically assigned port
 * for serving static files and proxying requests based on the config.
 *
 * @param  {Object.<string, string>} config   the config of the json-proxy for
 *                                            this test suite
 * @param  {Function} done callback
 */
function configureExpress(config, done) {
  var portfinder = require('portfinder');

  tmp.dir(function(err, filepath){
    handles.filepath = filepath;

    portfinder.getPort(function (err, port) {
      if (err) throw(err);

      handles.port = port;

      fs.writeFileSync(path.join(handles.filepath, 'index.txt'), 'hello, world');

      app.use(proxy.initialize(config));
      app.use(express.static(handles.filepath));

      handles.server = require('http').createServer(app);
      handles.server.listen(handles.port, function() {
        done(null, handles.port);
      });
    });
  });
}

/**
 * Creates a simple LAN proxy using a vanilla HTTP server
 * that verifies the state of the proxy credentials and the x-forwarded-url
 * are correct.
 * 
 * @param  {Object.<string, string>} options  the options for configuring this
 *                                            test suite
 * @param  {Object.<string, string>} config   the config of the json-proxy for
 *                                            this test suite
 * @param  {Function} done
 */
function configureLanProxy(options, config, done) {
  var portfinder = require('portfinder'),
      request = require('request'),
      credentials = config.proxy.gateway.auth,
      gatewayPort,
      expectedAuthorizationHeader,
      requestViaHeader,
      responseViaHeader;

  handles = handles || {};

  handles.gatewayServer = require('http').createServer(function (req, res) {
    expectedAuthorizationHeader = 'Basic ' + new Buffer(credentials).toString('base64');

    // validate the proxy target
    if (req.url !== req.headers['x-forwarded-url']) {
        res.writeHead(500);
        res.end('{ "error": 500, "message": "invalid proxy request, expected X-Forwarded-Url header ' + req.headers['x-forwarded-url'] + '" }');
        return;
    }

    // validate the proxy credentials
    if (req.headers['authorization'] !== expectedAuthorizationHeader) {
      res.writeHead(401);
      res.end('{ "error": 401, "message": "invalid proxy credentials, expected ' + expectedAuthorizationHeader + '" }');
      return;
    }

    // determine if we are using a proxy that is not RFC compliant
    requestViaHeader = options.headers['Via'] ||
                        '127.0.0.1:' + handles.port;

    responseHostHeader = options.headers['Host'] ||
                        req.headers['host'];

    responseViaHeader = options.headers['Via'] ||
                        'http://localhost:' + gatewayPort;

    // validate the via header was injected and points to 127.0.0.1 in either ipv4 or ipv6 format
    if (req.headers['via'] === undefined || req.headers['via'] === null || req.headers['via'].indexOf(requestViaHeader) === -1) {
      res.writeHead(400);
      res.end('{ "error": 400, "message": "invalid via header, expected ' + requestViaHeader + '" }');
      return;
    }

    // strip the proxy credentials header
    req.headers['authorization'] = null;
    // simulate the behavior of x-forwarded-for with multiple proxies
    req.headers['x-forwarded-for'] = [req.headers['x-forwarded-for'], req.headers['via']].join(', ');
    // change the via header to this server
    req.headers['via'] = responseViaHeader;
    req.headers['host'] = responseHostHeader;

    var errorCallback = function errorCallback(err, repsonse, body) {
      if (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ "error": 500, "message": err.message  }));
        return;
      }
    }

    request(req, errorCallback).pipe(res);
  });

  portfinder.getPort(function (err, port) {
    if (err) done(err);

    config.proxy.gateway.port = port;
    gatewayPort = port;

    handles.gatewayServer.listen(port, function() {
      done(null);
    });
  });
}

/**
 * Teardown logic for the reusable test suites
 * @param  {Function} done the async callback
 */
function cleanup(done) {
  config = null;

  rules.forEach(function(rule){
    rule.done();
  });
  nock.cleanAll();

  handles.server.close();
  if (handles.gatewayServer !== undefined && handles.gatewayServer !== null) {
    handles.gatewayServer.close();
  }

  fs.unlinkSync(path.join(handles.filepath, '/index.txt'));

  handles = null;

  done();
};

exports.setup = setup;
exports.configureLanProxy = configureLanProxy;
exports.cleanup = cleanup;
