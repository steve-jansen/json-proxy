#!/usr/bin/env node
/*
  json-proxy: A static file web server for UI developers that proxies JSON API
              calls to one or more remote web servers without requiring CORS or JSONP

  Copyright (c) 2013 Steve Jansen

  Modified version of the the NodeJitsu team's basic-proxy.js for node-http-proxy
  Copyright (c) 2010 Charlie Robbins, Mikeal Rogers, Fedor Indutny, & Marak Squires.

  (The MIT License)

  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const banner = [
  '',
  ' #####  ####   ####  #    #       #####  #####   ####  #    # #   #',
  '   #   #      #    # ##   #       #    # #    # #    #  #  #   # # ',
  '   #    ####  #    # # #  # ##### #    # #    # #    #   ##     #  ',
  '   #        # #    # #  # #       #####  #####  #    #   ##     #  ',
  '#  #        # #    # #   ##       #      #   #  #    #  #  #    #  ',
  '####   #####   ####  #    #       #      #    #  ####  #    #   #  ',
  ''
].join('\n');

const usage = [
  '',
  'A static file web server for UI developers that proxies JSON API',
  'calls to one or more remote web servers',
  '',
  '',
  'Usage: node server.js -p [port] -f [proxy forwarding rule] [directory]',
  '',
  '* multiple -f options are allowed',
  '* [directory] defaults to the current working directory',
  '',
  '',
  'Example: node server.js -p 8080 -f /api=server:8080',
  '',
  'This example will listen on http://localhost:8080, serving static files in',
  'the current working directory and forwarding /api/* requests to an API server',
  'on http://server:8080/api/*',
  '',
   'Example: node server.js -c /tmp/config.json',
  '',
  'This example uses a config file at /tmp/config.json for options',
  '',
  'Example: node server.js',
  '',
  'This example will attempt to load the config file at ./json-proxy.json'
 ].join('\n');

var static = require('node-static'),
    colors = require('colors'),
    util = require('util'),
    path = require('path'),
    http = require('http'),
    proxy = require('http-proxy'),
    url = require('url'),
    fs = require('fs');


// read the config file and/or commmand line parameters
var config = config();
printConfig();

// proxy server setup
var server = new proxy.RoutingProxy()
  .on('proxyError', function(err, req, res) {
    warn('proxy', req.method + ' ' + req.url + ' - error ' + err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.write('An error has occurred: ' + err.message);
    try { res.end() }
    catch (ex) { console.error("res.end error: %s", ex.message) }
  });
// static file server setup
var file = new(static.Server)(config.webroot);

// start the server
http.createServer(handleRequest).listen(config.port);

// called on every request
// decides if the request should be handled locally or forwarded to a remote server
// based on the forwarding ruleset
function handleRequest(req, res) {
  var match = false;

  // test if the requested url is a proxy rule match
  config.forward.forEach(function(rule) {
    if (!match && rule.regexp.test(req.url)) {
      
      proxyRequest(req, res, rule)
      match = true;
    }
  });

  // try to serve the request locally, if the url didn't match a proxy rule pattern
  if (!match) {
    file.serve(req, res, function(err, result) {
      if (err) {
        warn('serve', req.method + ' ' + req.url + ' - error ' + err.status + ' - ' + err.message);
        res.writeHead(err.status, err.headers);
        res.write(err.status.toString())
        res.end();
      } else {
        info('serve', req.method + ' ' + req.url);
      }
    });
  }
}

// inject any custom header values into a proxy request
// along with the x-forwarded-for, x-forwarded-port, and via headers
function injectProxyHeaders(req){
  // inject any custom headers as configured
  config.headers.forEach(function(header){
    req.headers[header.name] = header.value;
  });

  req.headers['x-forwarded-for'] = req.connection.remoteAddress || req.connection.socket.remoteAddress;
  req.headers['x-forwarded-port'] = req.connection.remotePort || req.connection.socket.remotePort;
}

// injects any LAN proxy servers into the request
function proxyRequest(req, res, rule) {
  injectProxyHeaders(req);
  
  if (null != config.gateway){
    info('proxy', req.method + ' ' + req.url + ' --> ' + config.gateway.host + ':' + config.gateway.port +  ' --> ' + rule.target.host + ':' + rule.target.port);
    req.url = url.parse('http://' + rule.target.host + ':' + rule.target.port + req.url).href;
    req.headers['host'] = rule.target.host;
    server.proxyRequest(req, res, { host: config.gateway.host, port: config.gateway.port, auth: config.gateway.auth });
  } else {
    info('proxy', req.method + ' ' + req.url + ' --> ' + rule.target.host + ':' + rule.target.port);
    server.proxyRequest(req, res, { host: rule.target.host, port: rule.target.port});
  }
}

// writes info messages to the console
function info(category, message) {
  util.puts(category.green.bold + ': ' + message.green);
}

// writes warning messages to the console
function warn(category, message) {
  util.puts(category.red.bold + ': ' + message.red);
}

// reads command line parameters
function config() {
  var config = {
        port: 8080,
        webroot: process.cwd(),
        gateway: null,
        forward: [],
        headers: []
      },
      argv = parseCommandLine(),
      token,
      temp;

  if (argv.help == true) {
    require('optimist').showHelp();
    process.exit(-1);
  }

  // try to read the config file
  temp = parseFile(argv.config, config);

  if (null != temp) {
    config = temp;
  } else {
    // read the command line arguments if no config file was given
    parseArgument(argv.port,    function(item) { config.port = item; });
    parseArgument(argv.gateway, function(item) { config.gateway = parseTargetServer(item); config.gateway.auth = url.parse(item).auth; });
    parseArgument(argv.forward, function(item) { config.forward.push(parseForwardRule(item)); });
    parseArgument(argv.header,  function(item) { config.headers.push(parseHeaderRule(item)); });
    parseArgument(argv._,       function(item) { config.webroot = path.resolve(path.normalize(item)); });
  }

  return config;
}

function printConfig() {
  // display the config as parsed
  util.puts(banner.rainbow.bold);
  info('proxy', 'listening on port ' + config.port);
  if (null != config.gateway) {
    info('proxy', 'routing forward rules via gateway ' + config.gateway.host + ':' + config.gateway.port);
  }
  config.forward.forEach(function(rule) {
    info('proxy', 'forwarding ' + rule.regexp.source + ' --> ' + rule.target.host + ':' + rule.target.port);
  });
  info('serve', 'hosting local files from ' + config.webroot);
}

function parseCommandLine() {
  return require('optimist')
        .usage(usage)
        .alias('p', 'port')
        .describe('p', 'The TCP port for the proxy server')
        .default('p', 8080)
        .alias('f', 'forward')
        .describe('f', 'a forwarding rule (ex. /foo=server/foo)')
        .alias('h', 'header')
        .describe('h', 'a custom request header (ex. iv-user=johndoe)')
        .alias('c', 'config')
        .describe('c', 'a config file')
        .alias('g', 'gateway')
        .describe('g', 'a local network HTTP proxy to route forward rules through')
        .alias('?', 'help')
        .describe('?', 'about this utility')
        .argv;
}

// reads a config file from either the config file specified on the command line, 
// or fallback to a file name json-proxy.config in the working directory
// return true if the file can be read, otherwise return false
function parseFile(filepath, config) {
  var temp = filepath || path.join(process.cwd(), '/json-proxy.json'),
      result = null;

  // if we were passed a config file, read and parse it
  if (fs.existsSync(temp)) {
    try {
      var data = fs.readFileSync(temp);
      config = JSON.parse(data.toString());

      // replace the token $config_dir with the absolute path to the configuredg file
      config.webroot = path.resolve(config.webroot.replace("$config_dir", path.dirname(filepath)));

      // transform the forwarding rules from a map to an array
      if (config.forward) {
        temp = [];
        for(var item in config.forward) {
          temp.push(parseForwardRule(item, config.forward[item]));
        }
        config.forward = temp;
        exists = true;
      }

      // transform the headers rules from a map to an array
      if (config.headers) {
        temp = [];
        for(var item in config.headers) {
          temp.push(parseHeaderRule(item, config.headers[item]));
        }
        config.headers = temp;
        result = config;
      }
    } catch (ex) {
      warn('error', 'Cannot parse the config file: ' + ex);
      process.exit(1);
    }
  }
  return result;
}

// argv.X will be an array if multiple -X options are provided
// otherwise argv.X will just be a scalar value
function parseArgument(arg, fn) {
  if (Array.isArray(arg)) {
    arg.forEach(function(item) {
      fn.call(this, item);
    });
  } else {
    if (arg != null) {
      fn.call(this, arg);
    }
  }
}

function parseHeaderRule() {
  var token = { name: null, value: null };

  if (arguments.length == 1) {
    token = tokenize(arguments[0]);
  } else {
      token.name = arguments[0];
      token.value = arguments[1];
  }

  return token;
}

// parses rule syntax to create forwarding rules
function parseForwardRule() {
  var token = { name: null, value: null },
      rule;

  if (arguments[0] == null)
    return;

  if (arguments.length == 1) {
    token = tokenize(arguments[0]);
  } else {
      token.name = arguments[0];
      token.value = arguments[1];
  }

  try {
    rule = { regexp: new RegExp(token.name, 'i'), target: parseTargetServer(token.value) };
  }  catch(ex) {
    warn('error', 'cannot parse the forwarding rule ' + arguments[0] + ' - ' + ex);
    process.exit(1);
  }

  return rule;
}

// parses a simple hostname:port argument, defaulting to port 80 if not specified
function parseTargetServer(value) {
  var target;
  // insert a http protocol handler if not found in the string
  if (value.indexOf('http://') != 0 && value.indexOf('https://') != 0) {
    value = 'http://' + value + '/';
  }
  target = url.parse(value);
  return { host: target.hostname, port: target.port || 80 };
}

// reads name/value tokens for command lengthine parameters
function tokenize(pair) {
  var token = { name: null, value: null },
      temp = null;
      
  if (null != pair)
    temp = pair.split('=');

  if (Array.isArray(temp) && temp.length > 1) {
    token.name = temp[0];
    token.value = temp[1];
  }

  return token;
}
