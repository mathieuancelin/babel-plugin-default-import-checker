require('colors');

const modules = {};
const namespaceImports = [];

function validateModules() {
  const errors = [];
  Object.keys(modules).map(k => modules[k]).forEach(module => {
    module.dependencies.forEach(dep => {
      const depModule = modules[dep.filename];
      if (depModule) {
        if (!depModule.exportDefault) {
          const message = `ERROR : module '${module.name}' try to use default binding
of module '${depModule.name}' at line [${dep.line}] but there is none.
 | import ${dep.variable} from '${dep.path}';
You should add a default binding to '${depModule.name}'
or use the following import :
 | import * as ${dep.variable} from  '${dep.path}';`;
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
      const message = `WARNING : module '${imprt.from}' is using namespace import of module '${imprt.filename}'
at line [${imprt.line}] but this module has default export. Maybe it's an error.
 | import * as ${imprt.variable} from '${imprt.path}';`;
      if (errors.indexOf(message) < 0) {
        warnings.push(message);
      }
    }
  });
  return [errors, warnings];
}

export default function defaultImportsChecker() {
  let id;
  return {
    visitor: {
      Program: {
        enter(node, parent) { // scope
          clearTimeout(id);
          modules[parent.file.opts.filename] = {
            name: parent.file.opts.filename,
            exportDefault: false,
            exportOther: false,
            dependencies: [],
          };
        },
        exit() { // node, parent, scope
          id = setTimeout(() => {
            clearTimeout(id);
            const [errors, warnings] = validateModules();
            if (warnings.length > 0) {
              console.log(warnings.join('\n\n').yellow);
            }
            if (warnings.length > 0 && errors.length > 0) {
              console.log('');
            }
            if (errors.length > 0) {
              console.log(errors.join('\n\n').red);
            }
          }, 100);
        },
      },
      ExportDefaultDeclaration(node, parent) { // scope
        // filename : parent.file.opts.filename
        modules[parent.file.opts.filename].exportDefault = true;
      },
      ExportDeclaration(node, parent) { // scope
        // filename : parent.file.opts.filename
        if (String(node.type) !== 'ExportDefaultDeclaration') {
          modules[parent.file.opts.filename].exportOther = true;
        }
      },
      ImportDeclaration(path, state) {
        // current file : state.file.opts.filename
        path.node.specifiers.map(specifier => {
          // variable name : specifier.local.name
          // relative module : path.node.source.value

          // ImportSpecifier => import { Foo } from './bar';
          // ImportDefaultSpecifier => import Foo from './bar';
          // ImportNamespaceSpecifier => import * as Foo from './bar';

          function extractFilename() {
            const relativePath = path.node.source.value.split('\/');
            const filePath = state.file.opts.filename.split('\/');
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

          if (String(specifier.type) === 'ImportNamespaceSpecifier' && path.node.source.value.startsWith('.')) {
            const filename = extractFilename();
            namespaceImports.push({
              from: state.file.opts.filename,
              filename,
              variable: specifier.local.name,
              path: path.node.source.value,
              line: specifier.loc.start.line,
            });
          }
          if (String(specifier.type) === 'ImportDefaultSpecifier' && path.node.source.value.startsWith('.')) {
            const filename = extractFilename();
            modules[state.file.opts.filename].dependencies.push({
              from: state.file.opts.filename,
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
