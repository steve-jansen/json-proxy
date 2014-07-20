var assert = require('assert'),
    path   = require('path'),
    fs     = require('fs'),
    tmp    = require('tmp');

describe('the config settings', function() {
    // test validator failure
    it('should create a default config', function(done){
        var configParser = require('../lib/config');
        var config = configParser();

        assert.equal(config.server.port, 8080, 'the cli server should default to port 8080');
        assert.equal(config.server.webroot, process.cwd(), 'the cli server should default to the process cwd');
        assert.equal(config.proxy.gateway, null, 'the proxy config should default to a null gateway');
        assert.equal(Object.keys(config.proxy.forward).length, 0, 'the proxy config should default to an empty set of forward rules');
        assert.equal(Object.keys(config.proxy.headers).length, 0, 'the proxy config should default to an empty set of headers rules');

        done();
    });


    describe('environmental variable parsing', function() {

        before(function(){
            process.env['JSON_PROXY_PORT'] = 1234;
            process.env['JSON_PROXY_WEBROOT'] = process.cwd() + '/../';
            process.env['JSON_PROXY_GATEWAY'] = "https://scott:tiger@example.com:1234/";
        });

        it('should override defaults', function(done){
            var configParser = require('../lib/config');
            var config;

            config = configParser();

            assert.equal(config.server.port, 1234, 'the cli server should use the env var JSON_PROXY_PORT');
            assert.equal(config.server.webroot, path.normalize(process.cwd() + '/../'), 'the cli server should use the env var JSON_PROXY_PORT');
            assert.equal(config.proxy.gateway.host, 'example.com', 'the proxy gateway should use the env var JSON_PROXY_GATEWAY for the gateway host');
            assert.equal(config.proxy.gateway.auth,  'scott:tiger', 'the proxy gateway should use the env var JSON_PROXY_GATEWAY for the auth info');

            process.env['JSON_PROXY_GATEWAY_AUTH'] = 'johndoe:password';
            config = configParser();
            process.env['JSON_PROXY_GATEWAY_AUTH'] = null;

            done();
        });


        after(function(){
            process.env['JSON_PROXY_PORT'] = null;
            process.env['JSON_PROXY_WEBROOT'] = null;
            process.env['JSON_PROXY_GATEWAY'] = null;
            process.env['JSON_PROXY_GATEWAY_AUTH'] = null;
        });
    });

    describe('configuration file parsing', function() {
       var filepath;
       var expected;

        before(function(done){
            process.env['JSON_PROXY_PORT'] = 1234;
            process.env['JSON_PROXY_WEBROOT'] = process.cwd() + '/../';
            process.env['JSON_PROXY_GATEWAY'] = 'http://scott:tiger@example.com:1234/';

            tmp.file(function (err, path) {
                filepath = path;

                expected = {
                    server: {
                        port: 4567,
                        webroot: "$config_dir",
                        html5mode: true
                    },
                    proxy: {
                        gateway: "http://alice:wonderland@127.0.0.1:5000",
                        forward: {
                            "/api": "http://example.com:80",
                            "/": "http://127.0.0.1:4444",
                        },
                        headers: {
                            "X-Forwarded-User": "Alice"
                        }
                    }
                }

                fs.writeFileSync(path, JSON.stringify(expected));

                done();
            });
        });


        it('should override environmental variables', function(done){
            var configParser = require('../lib/config');
            var config;

            config = configParser({ file: filepath });

            assert.equal(config.server.port, 4567, 'the cli server should use the file config value for port');
            assert.equal(config.server.webroot, path.join(filepath, '/../.'), 'the cli server should use the file config value for webroot');
            assert.equal(config.proxy.gateway.host, '127.0.0.1', 'the cli server should use the file config value for gateway/host');
            assert.equal(config.proxy.gateway.port, 5000, 'the cli server should use the file config value for gateway/port');
            assert.equal(config.proxy.gateway.auth, 'alice:wonderland', 'the proxy gateway should use file config value for gateway/auth');
            assert.equal(config.server.html5mode, true, 'the cli server should use the file config value for html5mode');

            assert.equal(config.proxy.forward.length, 2, 'the proxy forward rule count should match the config file');
            assert.equal(config.proxy.forward[0].regexp.pattern, /\/api/i.pattern);
            assert.equal(config.proxy.forward[0].target.host, 'example.com');
            assert.equal(config.proxy.forward[0].target.port, 80);

            assert.equal(config.proxy.forward[1].regexp.pattern, /\//i.pattern);
            assert.equal(config.proxy.forward[1].target.host, '127.0.0.1');
            assert.equal(config.proxy.forward[1].target.port, 4444);

            assert.equal(config.proxy.headers.length, 1, 'the proxy headers rule count should match the config file');
            assert.equal(config.proxy.headers[0].name, 'X-Forwarded-User');
            assert.equal(config.proxy.headers[0].value, 'Alice');

            done();
        });


        after(function(){
            process.env['JSON_PROXY_PORT'] = null;
            process.env['JSON_PROXY_WEBROOT'] = null;
            process.env['JSON_PROXY_GATEWAY'] = null;
            process.env['JSON_PROXY_GATEWAY_AUTH'] = null;
            fs.unlinkSync(filepath);
        });
    });

    describe('command line arguments', function() {
       var filepath;
       var expected;
       var argv;  // mock out the cmd line parsing of optimist

        before(function(done){
            process.env['JSON_PROXY_PORT'] = 1234;
            process.env['JSON_PROXY_WEBROOT'] = process.cwd() + '/../';
            process.env['JSON_PROXY_GATEWAY'] = "http://scott:tiger@example.com:1234/";

            argv = {
                port: 32000,
                gateway: 'http://bob:jones@myproxy.example.com:4444',
                html5mode: '/index.html',
                forward: [
                  '/api=http://bar.example.com:5555',
                  '/bar=http://baz.example.com:9999'
                ],
                header: [
                  'X-Forwarded-User=Bob',
                  'X-Forwarded-Id=20'
                ],
                '_': [
                    '/only/the/last/is/used',
                    '/not/used/either'
                ]
            };

            tmp.file(function (err, path) {
                filepath = path;

                expected = {
                    server: {
                        port: 4567,
                        webroot: filepath
                    },
                    proxy: {
                        gateway: "http://alice:wonderland@127.0.0.1:5000",
                        forward: {
                            "/api": "http://example.com:80",
                            "/": "http://127.0.0.1:4444",
                        },
                        headers: {
                            'X-Forwarded-User': 'Alice'
                        }
                    }
                }

                fs.writeFileSync(path, JSON.stringify(expected));

                argv['_'].push(require('path').join(filepath, '/../.'));
                done();
            });
        });


        it('should override the configuration file and environmental variables', function(done){
            var configParser = require('../lib/config');
            var config;

            config = configParser({ file: filepath, argv: argv });

            assert.equal(config.server.port, 32000, 'the cli server should use the cmd line arg for port');
            assert.equal(config.server.webroot, path.join(filepath, '/../.'), 'the cli server should use the cmd line arg for webroot');
            assert.equal(config.proxy.gateway.host, 'myproxy.example.com', 'the cli server should use the cmd line arg for gateway/host');
            assert.equal(config.proxy.gateway.port, 4444, 'the cli server should use the cmd line arg for gateway/port');
            assert.equal(config.proxy.gateway.auth, 'bob:jones', 'the proxy gateway should use the cmd line arg for gateway/auth');
            assert.equal(config.server.html5mode, '/index.html', 'the cli server should use the cmd line arg for html5mode');

            assert.equal(config.proxy.forward.length, 3, 'the proxy forward rules should include the config file rules and the cmd line rules');
            assert.equal(config.proxy.forward[0].regexp.pattern, /\/api/i.pattern);
            assert.equal(config.proxy.forward[0].target.host, 'bar.example.com');
            assert.equal(config.proxy.forward[0].target.port, 5555);

            assert.equal(config.proxy.forward[1].regexp.pattern, /\//i.pattern);
            assert.equal(config.proxy.forward[1].target.host, '127.0.0.1');
            assert.equal(config.proxy.forward[1].target.port, 4444);

            assert.equal(config.proxy.forward[2].regexp.pattern, /\/bar/i.pattern);
            assert.equal(config.proxy.forward[2].target.host, 'baz.example.com');
            assert.equal(config.proxy.forward[2].target.port, 9999);

            assert.equal(config.proxy.headers.length, 2, 'the proxy headers rules should include the config file rules and the cmd line rules');
            assert.equal(config.proxy.headers[0].name, 'X-Forwarded-User');
            assert.equal(config.proxy.headers[0].value, 'Bob');

            assert.equal(config.proxy.headers[1].name, 'X-Forwarded-Id');
            assert.equal(config.proxy.headers[1].value, 20);

            done();
        });


        after(function(){
            process.env['JSON_PROXY_PORT'] = null;
            process.env['JSON_PROXY_WEBROOT'] = null;
            process.env['JSON_PROXY_GATEWAY'] = null;
            process.env['JSON_PROXY_GATEWAY_AUTH'] = null;
            fs.unlinkSync(filepath);
        });
    });

    describe('explicit options passed to initialize()', function() {
       var filepath;
       var expected;
       var argv;  // mock out the cmd line parsing of optimist

        before(function(done){
            process.env['JSON_PROXY_PORT'] = 1234;
            process.env['JSON_PROXY_WEBROOT'] = process.cwd() + '/../';
            process.env['JSON_PROXY_GATEWAY'] = "http://scott:tiger@example.com:1234/";

            argv = {
                port: 32000,
                gateway: 'http://bob:jones@myproxy.example.com:4444',
                forward: [
                  '/api=http://bar.example.com:5555',
                  '/bar=http://baz.example.com:9999'
                ],
                header: [
                  'X-Forwarded-User=Bob',
                  'X-Forwarded-Id=20'
                ],
                '_': [
                    '/only/the/last/is/used',
                    '/not/used/either'
                ]
            };

            tmp.file(function (err, path) {
                filepath = path;

                expected = {
                    server: {
                        port: 4567,
                        webroot: filepath
                    },
                    proxy: {
                        gateway: 'http://alice:wonderland@127.0.0.1:5000',
                        forward: {
                            '/api': 'http://example.com:80',
                            '/': 'http://127.0.0.1:4444',
                        },
                        headers: {
                            'X-Forwarded-User': 'Alice'
                        }
                    }
                }

                fs.writeFileSync(path, JSON.stringify(expected));

                argv['_'].push(require('path').join(filepath, '/../.'));
                done();
            });
        });


        it('should override all other settings', function(done){
            var configParser = require('../lib/config');
            var config;

            config = configParser({
                file: filepath,
                argv: argv,
                server: {
                    port: 54321,
                    webroot: process.env['TEMP'] || process.env['TMPDIR'] || '/tmp'
                },
                proxy: {
                    gateway: 'http://nowhere.example.com',
                    forward: {
                        '/foo': 'http://example.com:7777'
                    },
                    headers: {
                        'X-Forwarded-User': 'Carol'
                    }
                }
            });

            assert.equal(config.server.port, 54321, 'the config should use the explicit option for the server port');
            assert.equal(config.server.webroot, path.normalize(process.env['TEMP'] || process.env['TMPDIR'] || '/tmp'), 'the config should use the explicit option for the webroot');
            assert.equal(config.proxy.gateway.host, 'nowhere.example.com', 'the config should use the explicit option for the gateway/host');
            assert.equal(config.proxy.gateway.port, 80, 'the config should use the explicit option for the gateway/port');
            assert.equal(config.proxy.gateway.auth, null, 'the config should use the explicit option for the gateway/auth');

            assert.equal(config.proxy.forward.length, 1, 'the proxy forward rules should use only the rules in the explicit options');
            assert.equal(config.proxy.forward[0].regexp.pattern, /\/api/i.pattern);
            assert.equal(config.proxy.forward[0].target.host, 'example.com');
            assert.equal(config.proxy.forward[0].target.port, 7777);

            assert.equal(config.proxy.headers.length, 1, 'the proxy headers rules should use only the rules in the explicit options');
            assert.equal(config.proxy.headers[0].name, 'X-Forwarded-User');
            assert.equal(config.proxy.headers[0].value, 'Carol');

            done();
        });


        after(function(){
            process.env['JSON_PROXY_PORT'] = null;
            process.env['JSON_PROXY_WEBROOT'] = null;
            process.env['JSON_PROXY_GATEWAY'] = null;
            process.env['JSON_PROXY_GATEWAY_AUTH'] = null;
            fs.unlinkSync(filepath);
        });
    });

describe('explicit options using an external config file', function() {
       var filepath;
       var expected;
       var argv;  // mock out the cmd line parsing of optimist

        before(function(done){
            process.env['JSON_PROXY_PORT'] = 1234;
            process.env['JSON_PROXY_WEBROOT'] = process.cwd() + '/../';
            process.env['JSON_PROXY_GATEWAY'] = "http://scott:tiger@example.com:1234/";

            argv = {
                port: 32000,
                gateway: 'http://bob:jones@myproxy.example.com:4444',
                forward: [
                  '/api=http://bar.example.com:5555',
                  '/bar=http://baz.example.com:9999'
                ],
                header: [
                  'X-Forwarded-User=Bob',
                  'X-Forwarded-Id=20'
                ],
                '_': [
                    '/only/the/last/is/used',
                    '/not/used/either'
                ]
            };

            tmp.file(function (err, path) {
                filepath = path;

                expected = {
                    server: {
                        port: 54321,
                        webroot: process.env['TEMP'] || process.env['TMPDIR'] || '/tmp'
                    },
                    proxy: {
                        gateway: 'http://nowhere.example.com',
                        forward: {
                            '/foo': 'http://example.com:7777'
                        },
                        headers: {
                            'X-Forwarded-User': 'Carol'
                        }
                    }
                }

                fs.writeFileSync(path, JSON.stringify(expected));

                argv['_'].push(require('path').join(filepath, '/../.'));
                done();
            });
        });


        it('should override all other settings', function(done){
            var configParser = require('../lib/config');
            var config;

            config = configParser({ file: filepath });

            assert.equal(config.server.port, 54321, 'the config should use the explicit option for the server port');
            assert.equal(config.server.webroot, path.normalize(process.env['TEMP'] || process.env['TMPDIR'] || '/tmp'), 'the config should use the explicit option for the webroot');
            assert.equal(config.proxy.gateway.host, 'nowhere.example.com', 'the config should use the explicit option for the gateway/host');
            assert.equal(config.proxy.gateway.port, 80, 'the config should use the explicit option for the gateway/port');
            assert.equal(config.proxy.gateway.auth, null, 'the config should use the explicit option for the gateway/auth');

            assert.equal(config.proxy.forward.length, 1, 'the proxy forward rules should use only the rules in the explicit options');
            assert.equal(config.proxy.forward[0].regexp.pattern, /\/api/i.pattern);
            assert.equal(config.proxy.forward[0].target.host, 'example.com');
            assert.equal(config.proxy.forward[0].target.port, 7777);

            assert.equal(config.proxy.headers.length, 1, 'the proxy headers rules should use only the rules in the explicit options');
            assert.equal(config.proxy.headers[0].name, 'X-Forwarded-User');
            assert.equal(config.proxy.headers[0].value, 'Carol');

            done();
        });


        after(function(){
            process.env['JSON_PROXY_PORT'] = null;
            process.env['JSON_PROXY_WEBROOT'] = null;
            process.env['JSON_PROXY_GATEWAY'] = null;
            process.env['JSON_PROXY_GATEWAY_AUTH'] = null;
            fs.unlinkSync(filepath);
        });
    });
});
