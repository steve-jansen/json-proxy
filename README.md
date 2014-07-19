json-proxy
==========

Run HTML5 apps locally and proxy your API calls to remote servers effortlessly
without CORS or JSONP :sunglasses:

Use json-proxy on the command line, as a grunt plugin for `grunt serve` livereloads, 
or as middleware inside Express or Connect NodeJS apps.

Forwarding rules match URLs to proxy to remote servers.  

Optionally injects custom HTTP request headers when proxying, which is great for
API tokens or authentication credentials during early prototyping.

### Screenshot of the CLI utility

![screenshot](https://raw.github.com/wiki/steve-jansen/json-proxy/screenshot.png)

### Status

[![Build Status](https://travis-ci.org/steve-jansen/json-proxy.svg?branch=master)](https://travis-ci.org/steve-jansen/json-proxy)
[![Code Climate](https://codeclimate.com/github/steve-jansen/json-proxy.png)](https://codeclimate.com/github/steve-jansen/json-proxy)
[![Test Coverage](https://codeclimate.com/github/steve-jansen/json-proxy/coverage.png)](https://codeclimate.com/github/steve-jansen/json-proxy)
![npm dependencies](https://david-dm.org/steve-jansen/json-proxy.png)

[![NPM](https://nodei.co/npm/json-proxy.png?downloads=true&stars=true)](https://nodei.co/npm/json-proxy/)

### Why write yet another Node.JS proxy??

My shop has much love for HTML5 single page apps that call server-side JSON APIs.
We're pretty open minded about server stacks, so the API might run on a Ruby, .Net,
or Play! app server.  This utility enables our front end UI devs to focus on writing
front-end HTML/CSS/JS goodness and not need to worry about how to provision/build/run
the app server on their local dev machine.

### Installation

For CLI usage:

		npm install -g json-proxy

For Express/Connect middleware:
	
		npm install json-proxy

For Grunt middleware:

		npm install json-proxy --save-dev

### Example Apps

An example of the json-proxy CLI can be run via the following shell scripts:

#### Windows
```
examples/cli/run
```

#### OS X and *nix
```
./examples/cli/run
```

An example of using json-proxy as express middleware can be run via:

```
node examples/middleware/index.js
```

An example of using json-proxy as grunt middleware can be run via:

#### Windows
```
cd examples/grunt
npm install -g grunt
npm install -g bower
npm install ../../../json-proxy
npm install
bower install
grunt serve
```

#### OS X and *nix
```
cd examples/grunt
sudo npm install -g grunt
sudo npm install -g bower
npm install ../../../json-proxy
npm install
bower install
grunt serve
```

### CLI Usage

```bash
  json-proxy [-c configFile] [-p port] [-f proxy forwarding rule]
             [-h header rule] [-html5mode [defaultFile]] [directory]

Examples:
   json-proxy -p 8080 -f "/api=http://server" -f "/=http://localhost:9000" .
   json-proxy -h "X-Forwarded-User=johndoe" /tmp/folder
   json-proxy -c "/tmp/config.json"

By default, looks for a config file at ./json-proxy.json

Environmental variables:
  JSON_PROXY_PORT         see --port
  JSON_PROXY_WEBROOT      directory
  JSON_PROXY_GATEWAY      --gateway
  JSON_PROXY_GATEWAY_AUTH "username:password" credentials for --gateway)

Options:
  -p, --port     The TCP port for the proxy server                      
  -f, --forward  a forwarding rule (ex. /foo=server/foo)                
  -h, --header   a custom request header (ex. iv-user=johndoel)         
  -c, --config   a config file                                          
  -g, --gateway  URL for a LAN HTTP proxy to use for forwarding requests
  --html5mode    support AngularJS HTML5 mode by catching 404s          
  -?, --help     about this utility                                     
  --version      version info                                      
 ```

### Grunt Usage

For Grunt build files using grunt-contrib-connect v0.8.0 or higher:

```js
livereload: {
  options: {
    middleware: function(connect, options, middlewares) {
      // inject json-proxy to the front of the default middlewares array
      middlewares.unshift(
        require('json-proxy').initialize({
          proxy: {
            forward: {
              '/api/': 'http://api.example.com:8080'
            },
            headers: {
              'X-Forwarded-User': 'John Doe'
            }
          }
        })
      );

      return middlewares;
    }
  }
}
```

You may also maintain the config options in an external file:

```js
livereload: {
  options: {
    middleware: function(connect, options, middlewares) {
      // inject json-proxy to the front of the default middlewares array
      middlewares.unshift(
        require('json-proxy').initialize({file: './myconfig.json' })
      );

      return middlewares;
    }
  }
}
```

For Grunt build files using `lrSnippet` in the livereload task,
place json-proxy before `lrSnippet` in the array of connect middlewares:

```js
livereload: {
    options: {
        middleware: function(connect) {
            return [
		          	require('json-proxy').initialize({
							    proxy: {
							      forward: {
							        '/api': 'http://api.example.com:8080'
							      },
							      headers: {
							      	'X-Forwarded-User': 'John Doe'
							    	}
							    }
							  }), // <-- here
                lrSnippet,
                mountFolder(connect, '.tmp'),
                mountFolder(connect, yeomanConfig.app)
            ];
        }
    }
}
```

### Developing

Unit tests are run with code coverage reporting via:

```
npm test
```

JSHint style checking is performed via:

```
npm run-script jshint
```

### Credits
This utility glues together the outstanding node packages 
[node-http-proxy by nodejitsu](https://github.com/nodejitsu/node-http-proxy) 
and [node-static by cloudhead](https://github.com/cloudhead/node-static) for 
proxying HTTP traffic and serving static files via HTTP.

### Issues
Please report bugs and features requets @ [https://github.com/steve-jansen/json-proxy/issues](https://github.com/steve-jansen/json-proxy/issues).
