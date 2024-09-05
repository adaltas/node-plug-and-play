[![Build Status](https://secure.travis-ci.org/adaltas/node-plug-and-play.svg)](http://travis-ci.org/adaltas/node-plug-and-play)

# Node.js Plug-And-Play package

Easily create hooks and let users plug their own logic across your code to make it extensible by everyone with new features.

## Main features

- Extention points definition
  Simple to declare new extention points, yet a lot of flexibility to the plugin authors.
- Hook definition
  Plugin writer can intercept calls to a function by placing their own logicl before, after and even switching the default implementation.
- Dependency management
  Plugins can require other plugins as required dependencies as well as choose the order of execution of each hook.
- Promise support
  Hook can be synchronous and asynchronous when returning a promise.
- Nested/hierachical
  Instanciate plugin instances with a parent reference and parent hooks will also be available inside the children.

## Learning

We encourage your to read the detailed tutorial on [how to create a plugin architected with Plug and Play](https://www.adaltas.com/en/2020/08/28/node-js-plugin-architecture/) published by [Adaltas](https://www.adaltas.com).

Here is the documentation:

- [Introduction](./docs/1.introduction.md)
- [Initialize a new instance](./docs/2.initialization.md)
- [Plugins registration](./docs/3.plugins.md)
- [Hook declaration](./docs/4.hook.md)
- [Hook handler definition and usage](./docs/5.handler.md)
- [API usage](./docs/6.api.md)
- [Developers instructions](./docs/7.developers.md)

## Quick example

Library and application authors define hooks, see [`./samples/simple-js/lib.js`](https://github.com/adaltas/node-plug-and-play/blob/master/samples/simple-js/lib.js):

```js
const plugandplay = require("plug-and-play");

const plugins = plugandplay();

module.exports = {
  // Create and export a new Plug and Play instance
  plugins: plugins,
  // Our core library function
  print: function () {
    // Wrap-up code
    plugins.call({
      // Identify this hook with a name
      name: "hooks:print",
      // Expose arguments to plugins authors
      args: {
        data: { message: "hello" },
      },
      // Default implementation
      handler: ({ data }) => {
        // Original library
        console.log(data.message);
      },
    });
  },
};
```

Users and pluging authors can now register their own hooks, see [`./samples/simple-js/index.js`](https://github.com/adaltas/node-plug-and-play/blob/master/samples/simple-js/index.js):

```js
const mysuperlibrary = require("./lib");

mysuperlibrary.plugins.register({
  hooks: {
    "hooks:print": ({ data }, handler) => {
      // Alter the argument
      data.message = "Hello World";
      // Print a message before the library code
      console.log(">>>>>>>>>>>");
      // Call the original handler
      const result = handler.call(null, { data: data });
      // Print a message after the library code
      console.log("<<<<<<<<<<<");
      return result;
    },
  },
});
mysuperlibrary.print();
```

While the original `print` function was only printing `Hello` to stdout, the introduction of this new plugin prints:

```
>>>>>>>>>>>
Hello world
<<<<<<<<<<<
```

## Available examples

- [simple-js](./samples/simple-js) JavaScript basic example.
  ```bash
  ./samples/simple-js/index.js
  ```
- [simple-ts](./samples/simple-ts) TypeScript basic example.
  ```bash
  ./samples/simple-ts/index.ts ping
  ```
- [advanced-ts](./samples/advanced-ts) TypeScript advanced examples with plugin type registration.
  ```bash
  ./samples/advanced-ts/index.ts ping pong
  ```
