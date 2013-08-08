var express = require('express'),
    proxy = require('../../lib/proxy');

var app = express();

app.configure(function() {
  app.use(express.favicon(false));
  app.use(express.logger('dev'));
  app.use(proxy.initialize({
    proxy: {
      'forward': {
        '/channel': 'http://www.youtube.com'
      }
    }
  }));
  app.use(express.static(__dirname));
});

app.listen(5000);
console.log('listening on http://localhost:5000');

