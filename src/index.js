/* eslint no-extend-native:0 */

require('colors');

const modules = {};
const namespaceImports = [];

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function startWithPolyfill(searchString, p) {
    const position = p || 0;
    return this.indexOf(searchString, position) === position;
  };
}

function runIn(milli, func) {
  const timeoutId = setTimeout(func, milli);
  return () => clearTimeout(timeoutId);
}

function validateModules() {
  const errors = [];
  Object.keys(modules).map(k => modules[k]).forEach(module => {
    module.dependencies.forEach(dep => {
      const depModule = modules[dep.filename];
      if (depModule) {
        if (!depModule.exportDefault) {
          const message = [
            [`ERROR : module '`.red, module.name.green, `' try to use default binding`.red].join(''),
            [` | of module '`.red, depModule.name.green, `' at line [${dep.line}] but there is none.`.red].join(''),
            [` | `.red, `${dep.line} > import ${dep.variable} from '${dep.path}';`.cyan].join(''),
            [` | You should add a default binding to '`.red, depModule.name.green, `'`.red].join(''),
            [` | or use the following import :`.red].join(''),
            [` | `.red, `${dep.line} > import * as ${dep.variable} from  '${dep.path}';`.cyan].join(''),
          ].join('\n');
          if (errors.indexOf(message) < 0) {
            errors.push(message);
          }
        }
      }
    });
  });
  const warnings = [];
  namespaceImports.forEach(imprt => {
    const dep = modules[imprt.filename];
    if (dep && dep.exportDefault && !dep.exportOther) {
      const message = [
        [`WARNING : module '`.yellow, imprt.from.green, `' is using namespace import of module '`.yellow, imprt.filename.green, `'`.yellow].join(''),
        [` | at line [${imprt.line}] but this module has default export. Maybe it's an error.`.yellow].join(''),
        [` | `.yellow, `${imprt.line} > import * as ${imprt.variable} from '${imprt.path}';`.cyan].join(''),
      ].join('\n');
      if (errors.indexOf(message) < 0) {
        warnings.push(message);
      }
    }
  });
  return [errors, warnings];
}

export default function defaultImportsChecker() {
  let cancel = () => ({});
  return {
    visitor: {
      Program: {
        enter(path, parent) { // scope
          cancel();
          modules[parent.file.opts.filename] = {
            name: parent.file.opts.filename,
            exportDefault: false,
            exportOther: false,
            dependencies: [],
          };
        },
        exit() { // path, parent, scope
          cancel = runIn(100, () => { // triggers only on last file
            cancel();
            const [errors, warnings] = validateModules();
            if (warnings.length > 0) {
              console.log(warnings.join('\n\n'));
            }
            if (warnings.length > 0 && errors.length > 0) {
              console.log('');
            }
            if (errors.length > 0) {
              console.log(errors.join('\n\n'));
            }
          });
        },
      },
      ExportDefaultDeclaration(path, parent) { // scope
        // filename : parent.file.opts.filename
        modules[parent.file.opts.filename].exportDefault = true;
      },
      ExportDeclaration(path, parent) { // scope
        // filename : parent.file.opts.filename
        if (String(path.type) !== 'ExportDefaultDeclaration') {
          modules[parent.file.opts.filename].exportOther = true;
        }
      },
      ImportDeclaration(path, parent) {
        // current file : parent.file.opts.filename
        path.node.specifiers.map(specifier => {
          // variable name : specifier.local.name
          // relative module : path.node.source.value

          // ImportSpecifier => import { Foo } from './bar';
          // ImportDefaultSpecifier => import Foo from './bar';
          // ImportNamespaceSpecifier => import * as Foo from './bar';

          function extractFilename() {
            const relativePath = path.node.source.value.split('\/');
            const filePath = parent.file.opts.filename.split('\/');
            filePath.pop();
            for (const i in relativePath) {
              const part = relativePath[i];
              if (part === '.') {
                // nothing
              } else if (part === '..') {
                filePath.pop();
              } else {
                filePath.push(part);
              }
            }
            return filePath.join('/') + '.js';
          }

          if (String(specifier.type) === 'ImportNamespaceSpecifier' && String(path.node.source.value || '').startsWith('.')) {
            const filename = extractFilename();
            namespaceImports.push({
              from: parent.file.opts.filename,
              filename,
              variable: specifier.local.name,
              path: path.node.source.value,
              line: specifier.loc.start.line,
            });
          }
          if (String(specifier.type) === 'ImportDefaultSpecifier' && String(path.node.source.value || '').startsWith('.')) {
            const filename = extractFilename();
            modules[parent.file.opts.filename].dependencies.push({
              filename,
              variable: specifier.local.name,
              path: path.node.source.value,
              line: specifier.loc.start.line,
            });
          }
        });
      },
    },
  };
}
