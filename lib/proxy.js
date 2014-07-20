'use strict';

var httpProxy    = require('http-proxy'),
    url          = require('url'),
    configParser = require('./config');

var routers = {},
    logger,
    config,
    useGateway;

exports.initialize = function initialize(options){
  logger = options.logger || require('./logger');
  config = configParser(options).proxy;
  useGateway = (config.gateway !== null && typeof(config.gateway) === 'object' && typeof(config.gateway.host) === 'string');

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
  var router,
      target;

  injectProxyHeaders(req, rule);

  if (useGateway) {
    // for HTTP LAN proxies, rewrite the request URL from a relative URL to an absolute URL
    // also add a header that can be inspected by the unit tests
    req.url =url.parse(rule.target.protocol + '//' + rule.target.host + ':' + rule.target.port + req.url).href; 
    req.headers['X-Forwarded-Url'] = req.url;
    
    // the proxy target is really the HTTP LAN proxy
    target = config.gateway;
    logger.info('proxy', req.method + ' ' + req.url + ' --> ' + config.gateway.host + ':' + config.gateway.port +  ' --> ' + rule.target.host + ':' + rule.target.port);
  } else {
    target = rule.target;
    logger.info('proxy', req.method + ' ' + req.url + ' --> ' + rule.target.protocol + '//' + rule.target.host + ':' + rule.target.port);
  }

  var errorCallback = function errorCallback(err, proxyRequest, proxyResponse) {
    var status = 500;

    if (proxyResponse !== null && proxyResponse.statusCode !== null) {
      status = proxyResponse.statusCode;
    }

    logger.warn('proxy', proxyRequest.method + ' ' + proxyRequest.url + ' - error ' + err.message);
    res.json(status, { error: status, message: err.message });
  };

  // get a ProxyServer from the cache
  router = createRouter(target);    

  // handle any errors returned by the target server
  router.on('error', errorCallback);

  // proxy the request
  router.web(req, res);

  router.removeListener('error', errorCallback);
}

// factory method to cache/fetch HttpProxy instances
function createRouter(target) {
  var key = target.protocol + '//' + target.host + ':' + target.port;
  var router = routers[key];
  var options;

  // httpProxy.createProxyServer options
  // {
  //   target : <url string to be parsed with the url module>
  //   forward: <url string to be parsed with the url module>
  //   agent  : <object to be passed to http(s).request>
  //   ssl    : <object to be passed to https.createServer()>
  //   ws     : <true/false, if you want to proxy websockets>
  //   xfwd   : <true/false, adds x-forward headers>
  //   secure : <true/false, verify SSL certificate>
  //   toProxy: passes the absolute URL as the path (useful for proxying to proxies)
  // }

  if (!router) {
    options = {
      xfwd: true, 
      secure: (target.protocol && target.protocol === 'https://'),
      target: key,
      toProxy: (useGateway === true)
    };

    router = httpProxy.createProxyServer(options);

    routers[key] = router;
  }

  return router;
}

// support basic auth for LAN HTTP proxied connections, if needed
// HACK: http-proxy uses node's http.request().pipe(), which doesn't properly
//       support the options.auth setting like http.request.write() as of Node v0.10.24,
//       so this copies the implementation of request.write() from http.request()
// SOURCE: https://github.com/joyent/node/blob/828f14556e0daeae7fdac08fceaa90952de63f73/lib/_http_client.js#L84-L88
function injectAuthHeader(req) {
  if (useGateway === true && typeof(config.gateway.auth) === 'string' && req.headers['authorization'] === undefined) {
    req.headers['authorization'] = 'Basic ' + new Buffer(config.gateway.auth).toString('base64');
  } 
}

// inject any custom header values into a proxy request
// along with the x-forwarded-for, x-forwarded-port, and via headers
function injectProxyHeaders(req, rule){
  // inject any custom headers as configured
  config.headers.forEach(function(header){
    req.headers[header.name] = header.value;
  });

  injectAuthHeader(req);

  // the HTTP host header is often needed by the target webserver config
  req.headers['host'] = rule.target.host;
  // document that this request was proxied
  req.headers['via'] =  'http://' + req.connection.address().address + ':' + req.connection.address().port;
}

