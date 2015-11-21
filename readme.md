babel-plugin-default-import-checker
------------------------------

Babel 6 plugin to check if your using default imports and namespace imports on local modules that exports default bindings.

This plugin only work on module transformed with Babel, it won't show any error for imports on `node_modules` modules.

Usage
===============

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

What it does
======================

If you define a module like

```javascript
export function hello() {
  return 'Hello World!';
}
```

and use it like

```javascript
import Hello from './hello';

const message = Hello();

console.log(message);
```

the `babel-plugin-default-import-checker` will display an error like

```
ERROR : module 'example/index.js' try to use default binding
of module 'example/hello.js' at line [1] but there is none.
 | import Hello from './hello';
You should add a default binding to 'example/hello.js'
or use the following import :
 | import * as Hello from  './hello';
```

also if you define a module like

```javascript
export default function hi() {
  return 'Hello World!';
}
```

and use it like

```javascript
import * as Hi from './hi';

console.log(Hi.hi());
```

the `babel-plugin-default-import-checker` will display a warning like

```
WARNING : module 'example/index.js' is using namespace import of module 'example/hi.js'
at line [1] but this module has default export. Maybe it's an error.
 | import * as Hi from './hi';
```
