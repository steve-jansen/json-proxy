json-proxy
==========

A static file web server for UI developers that proxies JSON API
calls to one or more remote web servers.

# About
This utility glues together the outstanding node packages 
[node-http-proxy by nodejitsu](https://github.com/nodejitsu/node-http-proxy) 
and [node-static by cloudhead](https://github.com/cloudhead/node-static) for 
proxying HTTP traffic and serving static files via HTTP.

# In Action
![screenshot](https://raw.github.com/wiki/steve-jansen/json-proxy/screenshot.png)

# Why write yet another Node.JS proxy??
My shop has much love for HTML5 single page apps that call server-side JSON APIs.
We're pretty open minded about server stacks, so the API might run on a Ruby, .Net,
or Play! app server.  This utility enables our front end UI devs to focus on writing
front-end HTML/CSS/JS goodness and not need to worry about how to provision/build/run
the app server on their local dev machine.

# Usage
`node server.js -p [port] -f [proxy forwarding rule] [directory]`

* multiple -f options are allowed
* [directory] defaults to the current working directory
* options:
  -p, --port     The TCP port for the proxy server [default: 8080]
  -f, --forward  a forwarding rule (ex. /foo=server/foo)
  -h, --header   a custom request header (ex. iv-user=johndoe)
  -c, --config   a config file
  -g, --gateway  a local network HTTP proxy to route forward rules through
  -?, --help     about this utility

# Examples
`node server.js -p 8080 -f /api=server:8080 -h iv-user=janedoe examples`

This example will listen on http://localhost:8080, serving static files in
the from the `./examples` folder, and forwarding /api/* to the API server URL
on http://server:8080/api/* along with the request header `iv-user: janedoe`.

`node server.js -c /tmp/config.json`

This example uses a config file at /tmp/config.json for options

`node server.js`

This example will attempt to load the config file named server.json in
the current working directory.
