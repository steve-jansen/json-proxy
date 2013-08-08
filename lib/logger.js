"use strict";

var colors = require('colors'),
    util   = require('util');

// writes info messages to the console
exports.info = function info() {
  var len = arguments.length;

  if (len === 1) {
    util.puts(arguments[0].green);
  } else {
    util.print(arguments[0].green.bold + ': ');
    for (var i = 1; i<len; i++) {
      util.print(arguments[i].green);
    }
    util.print('\n');
  }
};

// writes warning messages to the console
exports.warn = function warn() {
  var len = arguments.length;
  
  if (len === 1) {
    util.puts(arguments[0].red);
  } else {
    util.print(arguments[0].red.bold + ': ');
    for (var i = 1; i<len; i++) {
      util.print(arguments[i].red);
    }
    util.print('\n');
  }
};

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
