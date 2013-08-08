json-proxy
==========

A utility for UI developers to proxy JSON API calls to remote servers
while serving all other requests locally without CORS or JSONP.

Works both as Express/Connect middleware and a CLI utility.

A set of forwarding rules matches URLs that should be forwarded to remote
servers.  Also supports injection of custom HTTP request headers to
forwarded requests.

![screenshot](https://raw.github.com/wiki/steve-jansen/json-proxy/screenshot.png)

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

For use as middleware in grunt, simply add the following to the top of your array of middleware.

  require('json-proxy').initialize({}),

Normally, you will pass in options to this call to override the defaults:

```js
livereload: {
    options: {
        middleware: function (connect) {
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

Or you can store the config options in an external file:

```js
livereload: {
    options: {
        middleware: function (connect) {
            return [
		          	require('json-proxy').initialize({ file: './myconfig.json' }), // <-- here
                lrSnippet,
                mountFolder(connect, '.tmp'),
                mountFolder(connect, yeomanConfig.app)
            ];
        }
    }
}
```

### Credits
This utility glues together the outstanding node packages 
[node-http-proxy by nodejitsu](https://github.com/nodejitsu/node-http-proxy) 
and [node-static by cloudhead](https://github.com/cloudhead/node-static) for 
proxying HTTP traffic and serving static files via HTTP.

### Issues
Please report bugs and features requets @ [https://github.com/steve-jansen/json-proxy/issues](https://github.com/steve-jansen/json-proxy/issues).
