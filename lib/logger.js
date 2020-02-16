/* exported colors */
'use strict';

var colors = require('colors'),
    util   = require('util');

// writes info messages to the console
exports.info = function info() {
  console.log(format('green', arguments));
};

// writes warning messages to the console
exports.warn = function warn() {
  console.warn(format('yellow', arguments));
};

// writes error messages to the console
exports.error = function warn() {
  console.error(format('red', arguments));
};

// colorize strings and send to console.log
function format(color, messages) {
  var length = messages.length;

  if (length === 0 || typeof(color) !== 'string') {
    return;
  }

  return (util.format.apply(null, messages)[color]);
}

exports.banner = function banner() {
  console.log([
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
