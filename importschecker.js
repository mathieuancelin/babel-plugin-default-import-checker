'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

if (!Object.keys) {
  Object.keys = (function () {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function (obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

var every = 20;
var addedExpires = 100;
var waitingValidation = [];
var modulesThatExportDefault = {};
var last = Date.now();
var running = false;

function checkValidations() {
  if (waitingValidation.length > 0) {
    var validation = waitingValidation.pop();
    if (!modulesThatExportDefault[validation.filename]) {
      if (validation.expires < Date.now()) {
        console.log('ERROR : ' + validation.message);
      } else {
        waitingValidation.push(validation);
      }
    }
  }
  if ((last + 1000) > Date.now()) {
    running = true;
    setTimeout(checkValidations, every);
  } else {
    running = false;
  }
}

exports.default = function (babel) {
  console.log('instanciate babel plugin');
  checkValidations();
  return {
    visitor: {
      Program: {
        enter: function() {
          console.log('neter');
          last = Date.now();
          if (!running) {
            checkValidations();
          }
        },
        exit: function(node, parent, scope) {
          console.log('exiit');
          last = Date.now();
          if (!running) {
            checkValidations();
          }
        }
      },
      ExportDefaultDeclaration: function(node, parent, scope) {
        // filename : parent.file.opts.filename
        modulesThatExportDefault[parent.file.opts.filename] = true;
        waitingValidation.forEach(function(item) {
          item.expires = item.expires + addedExpires;
        });
        //console.log('Default export for ' + parent.file.opts.filename); // expose default
      },
      ImportDeclaration: function(path, state) {
        // current file : state.file.opts.filename
        path.node.specifiers.map(function(specifier, idx) {
          // variable name : specifier.local.name
          // relative module : path.node.source.value
          if (String(specifier.type) === 'ImportDefaultSpecifier' && path.node.source.value.startsWith('.')) {
            var relativePath = path.node.source.value.split('\/');
            var filePath = state.file.opts.filename.split('\/');
            filePath.pop();
            for (var i in relativePath) {
              var part = relativePath[i];
              if (part === '.') {
                // nothing
              } else if (part === '..') {
                filePath.pop();
              } else {
                filePath.push(part);
              }
            }
            var filename = filePath.join('/') + '.js';
            if (!modulesThatExportDefault[filename]) {
              var valid = {
                filename: filename,
                message: state.file.opts.filename + ' tries to import default binding of ' + filename + ' but there is none',
                expires: Date.now() + 20,
              };
              waitingValidation.push(valid);
            }
          }
        });
      },
    },
  };
}
