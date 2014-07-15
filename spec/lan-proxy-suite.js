var assert  = require('assert'),
    fs      = require('fs'),
    path    = require('path'),
    http    = require('http'),
    tmp     = require('tmp'),
    nock    = require('nock'),
    async   = require('async'),
    express = require('express'),
    app     = express(),
    proxy   = require('../lib/proxy');

var proxyPort,
    server,
    gatewayServer,
    tmpdir,
    endpoints;

/* HACK: mocha runs tests in parellel, so we have to force ignoring of env variables
by explicity setting all config items to be non-null */
var config = {
  server: {},
  proxy: {
    gateway: {
      protocol: 'http:',
      host: 'localhost',
      port: 0,
      auth: 'proxyuser:C0mp13x_!d0rd$$@P!' //'user:password' //
    },  
    forward: {
      '/api': 'http://api.example.com',
      '/foo/\\d+/bar': 'http://www.example.com',
      '/secure/': 'https://secure.example.com'
    }
  }
};

before(function(done){
  async.series([
    function configureNock(callback) {
      nock.disableNetConnect();
      nock.enableNetConnect('localhost');

      endpoints = [
        nock('http://api.example.com')
        .get('/api/hello')
        .reply(200, '{ "hello": "world" }')
        .get('/api/notfound')
        .reply(404),

        nock('http://www.example.com')
        .get('/foo/12345/bar')
        .reply(200, '{ "foo": "bar" }'),

        nock('https://secure.example.com')
        .get('/secure/api/hello')
        .reply(200, '{ "hello": "world" }')
        .get('/secure/api/notfound')
        .reply(404),
      ];

      callback();
    },
    function configureLanProxy(callback) {
      var portfinder = require('portfinder'),
          endPointPort = proxyPort,
          request = require('request');

      portfinder.getPort(function (err, port) {
        if (err)
          throw(err);

        config.proxy.gateway.port = port;

        gatewayServer = require('http').createServer(function (req, res) {
          // validate the proxy target
          if (req.url !== req.headers['x-forwarded-url']) {
              res.writeHead(500);
              res.end("invalid proxy request");
              return;
          }

          req.pipe(request(req.url)).pipe(res)
        });
        gatewayServer.listen(port, function() {
          callback();
        });
      });
    },
    function configureEndPoint(callback) {
      var portfinder = require('portfinder');
      tmp.dir(function(err, filepath){
        portfinder.getPort(function (err, port) {
          if (err)
            throw(err);

          proxyPort = port;
          tmpdir = filepath;

          fs.writeFileSync(path.join(tmpdir, 'index.txt'), 'hello, world');

          app.configure(function() {
            app.use(proxy.initialize(config));
            app.use(express.static(tmpdir));
          });
          server = require('http').createServer(app);
          server.listen(port, function() {
            callback();
          });
        });
      });
    }
  ], function(err) {
    if (err) throw err;
    done();
  })
});


describe('the proxy middleware using a HTTP gateway proxy on the LAN', function(done) {
  it('should fallback to static files', function(done){
    http.get('http://localhost:' + proxyPort + '/index.txt', function(res) {
      res.on('data', function (chunk) {
        assert('hello, world', chunk);
        done();
      });
    });
  });

  it('should route local errors', function(done){
    http.get('http://localhost:' + proxyPort + '/notfound', function(res) {
      assert(res.statusCode, 404);
      done();
    })
  });

  it('should proxy remote server errors', function(done){
    http.get('http://localhost:' + proxyPort + '/api/notfound', function(res) {
      assert(res.statusCode, 404);
      done();
    });
  });

  it('should proxy remote server errors over SSL', function(done){
    http.get('http://localhost:' + proxyPort + '/secure/api/notfound', function(res) {
      assert(res.statusCode, 404);
      done();
    });
  });

  it('should proxy remote server responses', function(done){
    http.get('http://localhost:' + proxyPort + '/api/hello', function(res) {

      assert(res.statusCode, 200);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert(o.hello, 'world');
        done();
      });
    });
  });

  it('should proxy remote server responses using regex rules', function(done){
    http.get('http://localhost:' + proxyPort + '/foo/12345/bar', function(res) {

      assert(res.statusCode, 200);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert(o.foo, 'bar');
        done();
      });
    });
  });

  it('should proxy remote server responses over SSL', function(done){
    http.get('http://localhost:' + proxyPort + '/secure/api/hello', function(res) {

      assert(res.statusCode, 200);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert(o.hello, 'world');
        done();
      });
    });
  });


  
});

after(function(done){
  endpoints.forEach(function(endpoint){
    endpoint.done();
  });
  server.close();
  gatewayServer.close();
  fs.unlinkSync(path.join(tmpdir, '/index.txt'));
  nock.enableNetConnect();
  nock.cleanAll();
  nock.restore();
  done();
});
