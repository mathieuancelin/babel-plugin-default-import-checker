'use strict';

var colors = require('colors');

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

var modules = {};
var errors = [];

function defaultModule(name) {
  if (!modules[name]) {
    modules[name] = {
      name: name,
      exportDefault: false,
      dependencies: [],
    }
  }
}

function validateModules() {
  // console.log(modules);
  for (var key in modules) {
    var module = modules[key];
    for (var dkey in module.dependencies) {
      var dep = module.dependencies[dkey];
      var depModule = modules[dep];
      if (depModule) {
        if (!depModule.exportDefault) {
          var message = 'ERROR : module ' + module.name
            + ' try to use default binding of module '
            + depModule.name + ' but there is none.';
          if (errors.indexOf(message) < 0) {
            errors.push(message);
          }
        }
      }
    }
  }
}

exports.default = function (babel) {
  var id;
  return {
    visitor: {
      Program: {
        enter: function() {
          clearTimeout(id);
        },
        exit: function(node, parent, scope) {
          validateModules();
          id = setTimeout(function() {
            clearTimeout(id);
            console.log(errors.join('\n').red);
            errors = [];
          }, 100);
        }
      },
      ExportDeclaration: function(node, parent, scope) {
        // filename : parent.file.opts.filename
        defaultModule(parent.file.opts.filename);

      },
      ExportDefaultDeclaration: function(node, parent, scope) {
        // filename : parent.file.opts.filename
        defaultModule(parent.file.opts.filename);
        modules[parent.file.opts.filename].exportDefault = true;
      },
      ImportDeclaration: function(path, state) {
        // current file : state.file.opts.filename
        defaultModule(state.file.opts.filename);
        path.node.specifiers.map(function(specifier, idx) {
          // variable name : specifier.local.name
          // relative module : path.node.source.value
          // if (String(specifier.type) === 'ImportNamespaceSpecifier' && path.node.source.value.startsWith('.')) {
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
            modules[state.file.opts.filename].dependencies.push(filename);
          }
        });
      },
    },
  };
}
