#!/usr/bin/env node

'use strict';

var express = require('express'),
    morgan = require('morgan'),
    proxy = require('./proxy'),
    configParser = require('./config'),
    logger = require('./logger'),
    pkginfo = require('../package.json');


exports.run = function run() {
  // read the config file and/or commmand line parameters
  var argv = optimist();
  var app = express();
  var config = configParser({ file: argv.config, argv: argv });

  app.use(morgan('dev'));
  app.use(proxy.initialize({ file: argv.config, argv: argv }));
  app.use(express.static(config.server.webroot));
  if (config.server.html5mode) {
    // support AngularJS's html5 location mode,
    // which requires rewriting all requests for content
    // to the single page app entry point, which is usually index.html
    var target = (typeof(argv.html5mode) === "string") ? argv.html5mode : '/index.html';
    app.use(function(req, res){
      logger.info('html5', 'rewriting ', req.url , ' to ',  target);
      res.sendfile(config.server.webroot + target);
    });
  }

  welcome(config);

  app.listen(config.server.port, function() {
    logger.info('proxy', 'listening on port ' + config.server.port);
  });
};

function welcome(config) {
  logger.banner();

  logger.info('proxy', 'hosting local files from ' + config.server.webroot);

  if (undefined !== config.gateway && null !== config.gateway) {
    logger.info('proxy', 'routing forward rules via gateway ' + config.gateway.host + ':' + config.gateway.port);
  }

  config.proxy.forward.forEach(function(rule) {
    if (undefined !== rule && null !== rule) {
      logger.info('proxy', 'forwarding ' + rule.regexp.source + ' --> ' + rule.target.host + ':' + rule.target.port);
    }
 });

  config.proxy.headers.forEach(function(rule) {
    logger.info('proxy', 'forwarding injects header "' + rule.name+ ': ' + rule.value + '"');
  });

}

function optimist() {
  var usage = [
    pkginfo.name + ' v' + pkginfo.version,
    '',
    'A utility for UI developers to proxy JSON API calls to remote servers',
    'while serving all other requests locally without CORS or JSONP.',
    '',
    '',
    'Usage:',
    '  json-proxy [-c configFile] [-p port] [-f proxy forwarding rule]',
    '             [-h header rule] [-html5mode [defaultFile]] [directory]',
    '',
    'Examples:',
    '   json-proxy -p 8080 -f "/api=http://server" -f "/=http://localhost:9000" .',
    '   json-proxy -h "X-Forwarded-User=johndoe" /tmp/folder',
    '   json-proxy -c "/tmp/config.json"',
    '',
    'By default, looks for a config file at ./json-proxy.json',
    '',
    'Environmental variables:',
    '  JSON_PROXY_PORT         see --port',
    '  JSON_PROXY_WEBROOT      directory',
    '  JSON_PROXY_GATEWAY      --gateway',
    '  JSON_PROXY_GATEWAY_AUTH "username:password" credentials for --gateway)'
  ].join('\n');

  var argv = require('optimist')
             .usage(usage)
             .alias('p', 'port')
             .describe('p', 'The TCP port for the proxy server')
             .alias('f', 'forward')
             .describe('f', 'a forwarding rule (ex. /foo=server/foo)')
             .alias('h', 'header')
             .describe('h', 'a custom request header (ex. iv-user=johndoel)')
             .alias('c', 'config')
             .describe('c', 'a config file')
             .alias('g', 'gateway')
             .describe('g', 'URL for a LAN HTTP proxy to use for forwarding requests')
             .describe('html5mode', 'support AngularJS HTML5 mode by catching 404s')
             .alias('?', 'help')
             .describe('?', 'about this utility')
             .describe('version', 'version info')
             .argv;

  if (argv.help === true) {
    require('optimist').showHelp();
    process.exit(-1);
  }
  if (argv.version === true) {
    logger.info(pkginfo.name + ' v' + pkginfo.version);
    process.exit(0);
  }

  return argv;
}

