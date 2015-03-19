var express = require('express'),
    morgan = require('morgan'),  
    proxy = require('../../lib/proxy');

var app = express();

app.use(morgan('dev'));
app.use(proxy.initialize({
  proxy: {
    'forward': {
      '/channel': 'https://www.youtube.com'
    }
  }
}));

app.use(express.static(__dirname));

app.listen(5000);
console.log('listening on http://localhost:5000');
