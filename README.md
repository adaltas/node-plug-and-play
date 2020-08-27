
[![Build Status](https://secure.travis-ci.org/adaltas/node-plug-and-play.svg)](http://travis-ci.org/adaltas/node-plug-and-play)

# Node.js Plugable package

Easily create hooks and let users plug their own logic across your code to make it extensible by everyone with new features.

## Main features 

* Extention points definition   
  Simple to declare new extention points, yet a lot of flexibility to the plugin authors.
* Hook definition   
  Plugin writer can intercept calls to a function by placing their own logicl before, after and even switching the default implementation.
* Dependency management   
  Plugins can require other plugins as required dependencies as well as choose the order of execution of each hook.
* Promise support   
  Hook can be synchronous and asynchronous when returning a promise.
* Nested/hierachical   
  Instanciate plugin instances with a parent reference and parent hooks will also be available inside the children.

## Learning

A detailed article is to be published soon.

## Quick example

Library and application authors must define hooks, see [`./sample/lib.js`](https://github.com/adaltas/node-plug-and-play/blob/master/sample/lib.js):

```js
const plugandplay = require('plug-and-play')

module.exports = {
  // Create and export a new Plug and Play instance
  plugins: plugandplay(),
  // Our core library function
  print: function() {
    // Wrap-up code
    module.exports.plugins.call({
      // Identify this hook with a name
      name: 'hooks:print',
      // Expose arguments to plugins authors
      args: {
        data: { message: 'hello' }
      },
      // Default implementation
      handler: ({data}) => {
        // Original library
        console.log(data.message)
      }
    })
  }
}
```

Users and pluging authors can now register their own hooks, see [`./sample/index.js`](https://github.com/adaltas/node-plug-and-play/blob/master/sample/error.js):

```js
const mysuperlibrary = require('./lib')

mysuperlibrary.register({
  hooks: {
    'hooks:print': ({data}, handler) => {
      // Alter the argument
      data.message = 'Hello world'
      // Print a message before the library code
      console.log('>>>>>>>>')
      // Call the original handler
      const result = handler.call(null, {data: data})
      // Print a message after the library code
      console.log('<<<<<<<<')
      return result
    }
  }
})
mysuperlibrary.print()
```

While the original `print` function was only printing `Hello` to stdout, the introduction of this new plugin prints:

```
>>>>>>>>
Hello world
<<<<<<<<
```
