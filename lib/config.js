"use strict";

var fs      = require('fs'),
    path    = require('path'),
    url     = require('url');

module.exports = function configParser(options) {
  var config = createDefaultConfig();
  var temp;
  options = options || {};

  // read environmental variables first
  config = parseEnv(config);

  // read a config file next
  config = parseFile(options.file, config);

  // process any command line arguments
  config = parseCommandLine(options.argv, config);

  // process the hard code values
  temp = parseConfig(options, config);

  // normalize the path to config.server.webroot
  if (config.server.webroot && config.server.webroot.length > 0) {
    config.server.webroot = path.normalize(config.server.webroot);
  }

  return config;
};

function createDefaultConfig() {
  return {
    server: {
      port: 8080,
      webroot: process.cwd(),
      html5mode: false
    },
    proxy: {
      gateway: null,
      forward: [],
      headers: []
    }
  };
}

function parseEnv(config) {
  var env = process.env;
  var temp;

  if (env['JSON_PROXY_PORT']) {
    temp = parseInt(env['JSON_PROXY_PORT'], 10);
    if (temp && !isNaN(temp)) {
      config.server.port = temp;
    }
  }

  if (env['JSON_PROXY_WEBROOT']) {
    temp = path.normalize(env['JSON_PROXY_WEBROOT']);
    if (temp && fs.existsSync(temp)) {
      config.server.webroot = temp;
    }
  }

  if (env['JSON_PROXY_GATEWAY']) {
    config.proxy.gateway = parseGateway(env['JSON_PROXY_GATEWAY'], env['JSON_PROXY_GATEWAY_AUTH']);
  }
  
  return config;
}

// reads a config file from either the config file specified on the command line, 
// or fallback to a file name json-proxy.config in the working directory
// return true if the file can be read, otherwise return false
function parseFile(filepath, config) {
  var contents;

  filepath = filepath || path.join(process.cwd(), '/json-proxy.json');

  // if we were passed a config file, read and parse it
  if (fs.existsSync(filepath)) {
    try {
      var data = fs.readFileSync(filepath);
      contents = JSON.parse(data.toString());
      config = parseConfig(contents, config);
    
      // replace the token $config_dir in the webroot arg
      if (config.server.webroot && config.server.webroot.length > 0) {
        config.server.webroot = config.server.webroot.replace("$config_dir", path.dirname(filepath));
      }
    } catch (ex) {
      throw new Error('Cannot parse the config file "' + filepath + '": ' + ex);
    }

  }

  return config;
}

// parse a config structure, overriding any values in config
function parseConfig(contents, config) {
  var temp;
  var item;

  contents.server = contents.server || {};
  contents.proxy = contents.proxy || {};

  // remap v0.0.1 versions of the config file
  contents.server.port = contents.server.port || contents.port;
  contents.server.webroot = contents.server.webroot || contents.webroot;
  contents.server.html5mode = contents.server.html5mode || contents.html5mode;
  contents.proxy.gateway = contents.proxy.gateway || contents.gateway;
  contents.proxy.forward = contents.proxy.forward || contents.forward;
  contents.proxy.headers = contents.proxy.headers || contents.headers;

  if (contents.proxy.gateway && typeof(contents.proxy.gateway) === "string" && contents.proxy.gateway.length > 0) {
    contents.proxy.gateway = parseGateway(contents.proxy.gateway);
  }

  // transform the forwarding rules from a map to an array
  if (contents.proxy.forward && contents.proxy.forward instanceof Object) {
    temp = [];
    for(item in contents.proxy.forward) {
      temp.push(parseForwardRule(item, contents.proxy.forward[item]));
    }
    contents.proxy.forward = temp;
  }

  // transform the headers rules from a map to an array
  if (contents.proxy.headers && contents.proxy.forward instanceof Object) {
    temp = [];
    for(item in contents.proxy.headers) {
      temp.push(parseHeaderRule(item, contents.proxy.headers[item]));
    }
    contents.proxy.headers = temp;
  }

  // override any values in the config object with values specified in the file
  config.server.port = contents.server.port || config.server.port;
  config.server.webroot = contents.server.webroot || config.server.webroot;
  config.server.html5mode = contents.server.html5mode || config.server.html5mode;
  config.proxy.gateway = contents.proxy.gateway || config.proxy.gateway;
  config.proxy.forward = contents.proxy.forward || config.proxy.forward;
  config.proxy.headers = contents.proxy.headers || config.proxy.headers;

  return config;
}

// reads command line parameters
function parseCommandLine(argv, config) {
  if (argv) {
    // read the command line arguments if no config file was given
    parseCommandLineArgument(argv.port, function(item){ 
      config.server.port = item; 
    });

    parseCommandLineArgument(argv.html5mode, function(item){ 
      config.server.html5mode = item; 
    });

    parseCommandLineArgument(argv._, function(item){
      config.server.webroot = path.normalize(item);
    });

    parseCommandLineArgument(argv.gateway, function(item){
      config.proxy.gateway = parseGateway(item);
    });
    
    parseCommandLineArgument(argv.forward, function(item){
      var rule = parseForwardRule(item);
      var match = false;

      config.proxy.forward.forEach(function(item) {
        if (item.regexp.source === rule.regexp.source) {
          item.target = rule.target;
          match = true;
        }
      });

      if (!match) {
        config.proxy.forward.push(rule);
      }
    });
    
    parseCommandLineArgument(argv.header, function(item){
      var rule = parseHeaderRule(item);
      var match = false;

      config.proxy.headers.forEach(function(item) {
        if (item.name === rule.name) {
          item.value = rule.value;
          match = true;
        }
      });

      if (!match) {
        config.proxy.headers.push(rule);
      }
    });
  }

  return config;
}

// argv.X will be an array if multiple -X options are provided
// otherwise argv.X will just be a scalar value
function parseCommandLineArgument(arg, fn) {
  if (typeof(fn) !== 'function')
    return;

  if (Array.isArray(arg)) {
    arg.forEach(function(item) {
      fn.call(null, item);
    });
  } else {
    if (arg !== null) {
      fn.call(null, arg);
    }
  }
}

function parseGateway(gateway, auth) {
  var config = null;

  if (gateway !== null && typeof(gateway) === "string" && gateway.length > 0) {
    config = parseTargetServer(gateway);
    config.auth = url.parse(gateway).auth;

    if (auth && typeof(auth) === "string" && auth.length > 0) {
      config.auth  = auth;
    }
  }
    
  return config;
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

  if (arguments[0] === undefined || arguments[0] === null)
    return;

  if (typeof(arguments[0]) === "object")
    return arguments[0];

  if (arguments.length == 1) {
    token = tokenize(arguments[0]);
  } else {
    token.name = arguments[0];
    token.value = arguments[1];
  }

  try {
    rule = { regexp: new RegExp('^' + token.name, 'i'), target: parseTargetServer(token.value) };
  }  catch(ex) {
    throw new Error('cannot parse the forwarding rule ' + arguments[0] + ' - ' + ex);
  }

  return rule;
}

// parses a simple hostname:port argument, defaulting to port 80 if not specified
function parseTargetServer(value) {
  var target;

  // insert a http protocol handler if not found in the string
  if (value.indexOf('http://') !== 0 && value.indexOf('https://') !== 0) {
    value = 'http://' + value + '/';
  }
  target = url.parse(value);
  return { host: target.hostname, port: target.port || ((target.protocol === 'https:') ? 443 : 80), protocol: target.protocol };
}

// reads name/value tokens for command lengthine parameters
function tokenize(pair) {
  var token = { name: null, value: null },
      temp = null;
      
  if (null !== pair)
    temp = pair.split('=');

  if (Array.isArray(temp) && temp.length > 1) {
    token.name = temp[0];
    token.value = temp[1];
  }

  return token;
}
