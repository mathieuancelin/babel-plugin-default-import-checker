# babel-plugin-default-import-checker

Babel 6 plugin to check if your using default imports and namespace imports on local modules that exports (or not) default bindings.

This plugin only work on module transformed with Babel, it won't show any error for imports on `node_modules` modules.

## Usage

```
npm install --save babel-plugin-default-import-checker
```

then in you `.babelrc` file

```javascript
{
  "plugins": [
    "babel-plugin-default-import-checker"
  ]
}
```

or just run a `babel-cli` command with a `--plugins` option

```
babel --plugins babel-plugin-default-import-checker src --out-dir lib
```

## What it does

### Detect module without default binding being imported as default import

If you define the following module

```javascript
export function hello() {
  return 'Hello World!';
}
```

and use import it from elsewhere like it's a default binding

```javascript
import Hello from './hello';

const message = Hello();

console.log(message);
```

the `babel-plugin-default-import-checker` will display the following error

```
ERROR : module 'example/index.js' try to use default binding
of module 'example/hello.js' at line [1] but there is none.
|1| import Hello from './hello';
You should add a default binding to 'example/hello.js'
or use the following import :
|1| import * as Hello from  './hello';
```

### Detect module with default imports being imported as namespace import

if you define the following module

```javascript
export default function hi() {
  return 'Hello World!';
}
```

and use import it using namespace import

```javascript
import * as Hi from './hi';

console.log(Hi.hi());
```

the `babel-plugin-default-import-checker` will display a warning unless there is other exported functions in the imported module.

```
WARNING : module 'example/index.js' is using namespace import of module 'example/hi.js'
at line [1] but this module has default export. Maybe it's an error.
|1| import * as Hi from './hi';
```
