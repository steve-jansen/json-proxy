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
[![npm dependencies](https://www.bithound.io/github/steve-jansen/json-proxy/badges/dependencies.svg)](https://www.bithound.io/github/steve-jansen/json-proxy/master/dependencies/npm)

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

		npm install json-proxy --save

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

### Forwarding Rules

The forwarding rules for proxying support a number of different scenarios.

The forwarding rules use regular expressions in the spirit of nginx rewrite rules.

json-proxy will always preserve the request body (e.g., requests with
`POST`, `PUT`, or `PATCH` verbs).  json-proxy will generally preserve
request headers, except in two situations.  Custom headers in the config will
always clobber the existing value of the same header in the original request.
The proxy will also clobber headers typically used by proxy servers
(e.g., `Via`, `X-Forwarded-For`).

**TIP:** Reserved characters in Regex such as `?` and
[Regex character classes](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions#Using_Special_Characters) like `\d` (digits) and `\s` (whitespace) require escaping with a backslash
in forwaring rules (e.g. `'\?'`, `'\\d'`, `'\\s'`).


#### Forwarding the requested URL "as is" to another server

This scenario is the original use case for json-proxy and works
out of the box without any special syntax. Specify the local URL path
to match and the remote server:

``` js
var config = {
  "forward": {
    "/api/": "http://api.example.com"
  }
};
```

This config would forward requests for `/api/*` to
`http://api.example.com:80/api/*`.


#### Pattern matching a URL


``` js
var config = {
  "forward": {
    "/user/\\d+/email": "http://api.example.com"
  }
};

```

This config would forward requests for `/user/12345/email` to
`http://api.example.biz:80/user/12345/email`.


#### URL Rewriting to delete a base path from the requested URL

You will need to use a regex capture group to delete fragments from the
requested URL.  Use `()`s to identify the fragments you want to keep in
the orignally requested URL.  Use `$1`, `$2`, ... `$9` in the target URL
to include the captured fragments.

``` js
var config = {
  "forward": {
    "/remote-api/(.*)": "https://api.example.com/$1"
  }
};

```

This config would forward requests for `/remote-api/*` to
`https://api.example.biz:443/*`.


#### URL Rewriting to add a base path to the requested URL

The target server can prepend a base path for remote servers:

``` js
var config = {
  "forward": {
    "/junction/": "http://www.example.com/subapp"
  }
};

```

This config would forward requests for `/junction/*` to
`http://api.example.biz:80/subapp/junction/*`.


#### URL Rewriting to rearrange fragments

``` js
var config = {
  "forward": {
    "/user/(\\d+)/email/(\\S+)?(.*)": "http://api.example.com/account?id=$1&email=$2&$3"
  }
};

```

This config would forward requests for `/user/12345/email/987` to
`http://api.example.biz:443/account/12345/subscriptions/987`.


### Header Injection

The proxy can optionally inject headers into proxied requests.  This is useful
for remote endpoints that require headers values for authorization, like
API tokens.  The value of the injected header may be either a string value
or a function that accepts the request object and returns a string value.

Examples:
```
{
  proxy: {
    forward: {
      '/api/': 'http://api.example.com:8080'
    },
    headers: {
      'X-Forwarded-User': 'John Doe'
    }
  }
}
```

```
{
  proxy: {
    forward: {
      '/api/': 'http://api.example.com:8080'
    },
    headers: {
      'Authorization':  function(req) {
        accessToken = (req.user && req.user.access_token) ? req.user.access_token : 'api_token'
        return 'Bearer '.concat(accessToken)
      }
    }
  }
}
```

### WebSockets

WebSockets are not implemented yet.  WebSockets seem straightforward
to implement with the http-proxy module.
Please [create an issue](https://github.com/steve-jansen/json-proxy/issues/new) 
if you need WebSocket support, along some details on your desired use case to
help spec the tests.

### Developing

Unit tests are run with code coverage reporting via:

```
npm test
```

New features and fixes should include relevant test cases.

JSHint style checking should always pass:

```
npm run-script jshint
```

### Credits
This utility glues together the outstanding node packages 
[node-http-proxy by nodejitsu](https://github.com/nodejitsu/node-http-proxy) 
and [node-static by cloudhead](https://github.com/cloudhead/node-static) for 
proxying HTTP traffic and serving static files via HTTP.

Thanks to @ehtb for contributing new features.

### Issues
Please report bugs and features requets @ [https://github.com/steve-jansen/json-proxy/issues](https://github.com/steve-jansen/json-proxy/issues).
