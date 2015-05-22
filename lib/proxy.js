'use strict';

var httpProxy    = require('http-proxy'),
    util         = require('util'),
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
    var match = config.forward.some(function(rule) {
      if (rule.regexp.test(req.url)) {
        proxyRequest(req, res, rule);
        return true;
      }
    });

    // fall through to the next middleware if there wasn't a proxy match rule
    if (match === false) {
      next();
    }
  };
};

// injects any LAN proxy servers into the request
function proxyRequest(req, res, rule) {
  var router,
      target,
      path;

  injectProxyHeaders(req, rule);

  // rewrite the base path of the requested URL
  path = req.url.replace(rule.regexp, rule.target.path);

  if (useGateway) {
    // for HTTP LAN proxies, rewrite the request URL from a relative URL to an absolute URL
    // also add a header that can be inspected by the unit tests
    req.url = url.parse(util.format('%s//%s:%s%s', rule.target.protocol, rule.target.host, rule.target.port, path)).href;
    req.headers['X-Forwarded-Url'] = req.url;

    // the proxy target is really the HTTP LAN proxy
    target = config.gateway;
    logger.info('proxy: %s %s --> %s:%s --> %s//%s:%s%s', req.method, req.url, config.gateway.host, config.gateway.port, rule.target.protocol, rule.target.host, rule.target.port, path);
  } else {
    target = rule.target;
    logger.info('proxy: %s %s --> %s//%s:%s%s', req.method, req.url, rule.target.protocol, rule.target.host, rule.target.port, path);
    req.url = path;
  }

  var errorCallback = function errorCallback(err, proxyRequest, proxyResponse) {
    var status = 500;
    if (proxyResponse !== undefined && proxyResponse !== null && proxyResponse.statusCode >= 400) {
      status = proxyResponse.statusCode;
    }

    logger.error('proxy: error - %s %s - %s', proxyRequest.method, proxyRequest.url, err.message);
    res.status(status).json({ error: status, message: err.message });
  };

  // get a ProxyServer from the cache
  router = createRouter(target);

  // proxy the request
  router.web(req, res, errorCallback);
}

// factory method to cache/fetch HttpProxy instances
function createRouter(target) {
  var key = util.format('%s//%s:%s', target.protocol, target.host, target.port),
      router = routers[key],
      options;

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

  if (router === undefined || router === null) {
    options = {
      xfwd: true,
      secure: (target.protocol && target.protocol === 'https://'),
      target: key,
      prependPath: (useGateway === true),
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
  // the HTTP host header is often needed by the target webserver config
  req.headers['host'] = rule.target.host + (rule.target.originalPort ? util.format(':%d', rule.target.originalPort) : '');
  // document that this request was proxied
  req.headers['via'] =  util.format('http://%s:%s', req.connection.address().address, req.connection.address().port);

  // inject any custom headers as configured
  config.headers.forEach(function(header) {
    var value = header.value,
        name = header.name;

    if(typeof(value) === 'function') {
      value = value.call(undefined, req);
    }

    if(typeof(value) !== 'string') {
      value = '';
    }

    if (typeof(name) === 'string') {
      req.headers[name.toLowerCase()] = value;
    }
  });

  injectAuthHeader(req);
}
