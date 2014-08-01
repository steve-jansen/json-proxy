var http   = require('http'),
    assert = require('assert');

exports.run = function run() {
  it('should fallback to static files', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/index.txt', function(res) {
      res.on('data', function (chunk) {
        assert.strictEqual('hello, world', chunk.toString());
        done();
      });
    });
  });

  it('should route local errors', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/notfound', function(res) {
      assert.strictEqual(res.statusCode, 404);
      done();
    })
  });

  it('should proxy remote server errors', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/api/notfound', function(res) {
      assert.strictEqual(res.statusCode, 404);
      done();
    });
  });

  it('should proxy remote server errors over SSL', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/secure/api/notfound', function(res) {
      assert.strictEqual(res.statusCode, 404);
      done();
    });
  });

  it('should proxy remote server responses', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/api/hello', function(res) {

      assert.strictEqual(res.statusCode, 200);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert.strictEqual(o.hello, 'world');
        done();
      });
    });
  });

  it('should proxy remote server responses using regex rules', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/foo/12345/bar', function(res) {

      assert.strictEqual(res.statusCode, 200);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert.strictEqual(o.foo, 'bar');
        done();
      });
    });
  });

  it('should proxy remote server responses over SSL', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/secure/api/hello', function(res) {

      assert.strictEqual(res.statusCode, 200);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert.strictEqual(o.hello, 'world');
        done();
      });
    });
  });

  it('should support simple regex rewrites of the target server', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/rewrite/v1/hello', function(res) {

      assert.strictEqual(res.statusCode, 200);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert.strictEqual(o.hello, 'world');
        done();
      });
    });
  });

  it('should support complex regex rewrites of the target server', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/rewrite/v2/foo/unwanted_token/bar', function(res) {

      assert.strictEqual(res.statusCode, 200);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert.strictEqual(o.foo, 'bar');
        done();
      });
    });
  });

  it('should support simple rewrites that add a base path to remote server URLs', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/junction/customer/1', function(res) {

      assert.strictEqual(res.statusCode, 200);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert.strictEqual(o.id, 1);
        done();
      });
    });
  });

  // regression test for https://github.com/steve-jansen/json-proxy/issues/8
  it('should support simple rewrites that remove a base path from remote server URLs', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/remote-api/issue/8', function(res) {

      assert.strictEqual(res.statusCode, 200);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert.strictEqual(o.reporter, "@heygrady");
        done();
      });
    });
  });

  it('should support rewrites from URL paths to querystrings', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/user/1/email/2', function(res) {

      assert.strictEqual(res.statusCode, 200);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert.strictEqual(o.email, "john.doe@example.com");
        done();
      });
    });
  });

  it('sends 500 errors when the server is unreachable', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/dns-error/hello/world', function(res) {

      assert.strictEqual(res.statusCode, 500);

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert.strictEqual(o.error,  500);
        assert.strictEqual(o.message,  'Nock: Not allow net connect for "notfound.example.com:443"');
        done();
      });
    });
  });

  it('can use a function for header injection', function(done){
    http.get('http://localhost:'+ this.proxyPort + '/pull/15/token', function(res) {

      res.on('data', function (chunk) {
        var o = JSON.parse(chunk);
        assert.strictEqual(o.author, 'ehtb');
        done();
      });
    });
  });
}
