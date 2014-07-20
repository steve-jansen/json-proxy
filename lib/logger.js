/* exported colors */
"use strict";

var colors = require('colors'),
    util   = require('util');

// writes info messages to the console
exports.info = function info() {
  write('green', arguments);
};

// writes warning messages to the console
exports.warn = function warn() {
  write('red', arguments);
};

function write(color, messages) {
  var len = messages.length;
  
  if (len === 1) {
    util.puts(messages[0][color]);
  } else {
    util.print(messages[0][color].bold + ': ');
    for (var i = 1; i<len; i++) {
      util.print(messages[i][color]);
    }
    util.print('\n');
  }
}

exports.banner = function banner() {
  util.puts([
    '',
    ' #####  ####   ####  #    #       #####  #####   ####  #    # #   #',
    '   #   #      #    # ##   #       #    # #    # #    #  #  #   # # ',
    '   #    ####  #    # # #  # ##### #    # #    # #    #   ##     #  ',
    '   #        # #    # #  # #       #####  #####  #    #   ##     #  ',
    '#  #        # #    # #   ##       #      #   #  #    #  #  #    #  ',
    '####   #####   ####  #    #       #      #    #  ####  #    #   #  ',
    ''
  ]
  .join('\n')
  .rainbow
  .bold
  );
};
