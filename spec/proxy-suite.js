var assert  = require('assert'),
    fs      = require('fs'),
    path    = require('path'),
    http    = require('http'),
    tmp     = require('tmp'),
    nock    = require('nock'),
    express = require('express'),
    app     = express(),
    proxy   = require('../lib/proxy');

var proxyPort;
var server;
var tmpdir;
/* HACK: mocha runs tests in parellel, so we have to force ignoring of env variables
  by explicity setting all config items to be non-null */
var config = {
  server: {},
  proxy: {
  	gateway: {}, 
		forward: {
		  '/api': 'http://api.example.com',
		  '/foo/\\d+/bar': 'http://www.example.com'
		}
  }
};

var scope = nock('http://api.example.com')
            .get('/api/hello')
            .reply(200, '{ "hello": "world" }')
            .get('/api/notfound')
            .reply(404);

var scope2 = nock('http://www.example.com')
            .get('/foo/12345/bar')
            .reply(200, '{ "foo": "bar" }');

describe('the proxy middleware ', function(done) {

	before(function(done){            
		nock.disableNetConnect();
		nock.enableNetConnect('localhost');

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
				server = app.listen(proxyPort);
				done();
			});
    });
  });

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


	after(function(done){
		scope.done();
		scope2.done();
		nock.enableNetConnect();
		nock.cleanAll();
		server.close();
		fs.unlinkSync(path.join(tmpdir, '/index.txt'));
		done();
  });
});

