"use strict";

var proxy        = require('http-proxy'),
    url          = require('url'),
    configParser = require('./config');

var logger;
var config;
var routers = {};

exports.initialize = function initialize(options){
  logger = options.logger || require('./logger');
  config = configParser(options).proxy;

  // called on every request
  // decides if the request should be handled locally or forwarded to a remote server
  // based on the forwarding ruleset
  return function jsonProxy(req, res, next) {
    var match = false;

    // test if the requested url is a proxy rule match
    config.forward.forEach(function(rule) {
      if (!match && rule.regexp.test(req.url)) {
        proxyRequest(req, res, rule);
        match = true;
      }
    });

    if (!match)
      next();
  };
};

// injects any LAN proxy servers into the request
function proxyRequest(req, res, rule) {
 //var router = new proxy.RoutingProxy({ enable: { xforward: true } });
  var buffer = proxy.buffer(req);
  var router;
  var target;

  injectProxyHeaders(req, rule);
  
  if (config.gateway && config.gateway.host && config.gateway.port){
    // for HTTP LAN proxies, rewrite the request URL from a relative URL to an absolute URL
    req.url = url.parse(rule.target.protocol + rule.target.host + ':' + rule.target.port + req.url).href;
    // the proxy target is really the HTTP LAN proxy
    target = config.gateway;
    logger.info('proxy', req.method + ' ' + req.url + ' --> ' + config.gateway.host + ':' + config.gateway.port +  ' --> ' + rule.target.host + ':' + rule.target.port);
  } else {
    target = rule.target;
    logger.info('proxy', req.method + ' ' + req.url + ' --> ' + rule.target.host + ':' + rule.target.port);
  }

  var errorCallback = function errorCallback(err, proxyRequest, proxyResponse) {
    var status = proxyRequest.statusCode || 500;
    logger.warn('proxy', proxyRequest.method + ' ' + proxyRequest.url + ' - error ' + err.message);
    res.json(status, { error: status, message: err.message });
  };

  // get a HttpProxy from the cache
  router = createRouter(target, errorCallback);    

  // handle any errors returned by the target server
  router.on('proxyError', errorCallback);

  // proxy the request
  router.proxyRequest(req, res, buffer);

  // handle any errors returned by the target server
  router.removeListener('proxyError', errorCallback);
}

// factory method to cache/fetch HttpProxy instances
function createRouter(target) {
  var key = target.protocol + target.host + ':' + target.port;
  var router = routers[key];
  var options;

  if (!router) {
    options = {
      enable: { xforward: true }, 
      target: {
        https: (target.protocol && target.protocol === 'https://'),
        host: target.host,
        port: target.port
      }
    };

    // support basic auth for LAN HTTP proxied connections, if needed
    if (target.auth)
      options.target.auth = target.auth;

    router = new proxy.HttpProxy(options);

    routers[key] = router;
  }

  return router;
}


// inject any custom header values into a proxy request
// along with the x-forwarded-for, x-forwarded-port, and via headers
function injectProxyHeaders(req, rule){
  // inject any custom headers as configured
  config.headers.forEach(function(header){
    req.headers[header.name] = header.value;
  });

  // the HTTP host header is often needed by the target webserver config
  req.headers['host'] = rule.target.host;
  // document that this request was proxied
  req.headers['via'] =  'http://' + req.connection.address().address + ':' + req.connection.address().port;
}

