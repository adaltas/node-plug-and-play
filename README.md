
[![Build Status](https://secure.travis-ci.org/adaltas/node-plug-and-play.svg)](http://travis-ci.org/adaltas/node-plug-and-play)

# Node.js Plug-And-Play package

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

We encourage your to read the detailed tutorial on [how to create a plugin architected with Plug and Play](https://www.adaltas.com/en/2020/08/28/node-js-plugin-architecture/) published by [Adaltas](https://www.adaltas.com).

## Quick example

Library and application authors define hooks, see [`./sample/lib.js`](https://github.com/adaltas/node-plug-and-play/blob/master/sample/lib.js):

```js
const plugandplay = require('plug-and-play')

const plugins = plugandplay()

module.exports = {
  // Create and export a new Plug and Play instance
  plugins: plugins,
  // Our core library function
  print: function() {
    // Wrap-up code
    plugins.call({
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

mysuperlibrary.plugins.register({
  hooks: {
    'hooks:print': ({data}, handler) => {
      // Alter the argument
      data.message = 'Hello World'
      // Print a message before the library code
      console.log('>>>>>>>>>>>')
      // Call the original handler
      const result = handler.call(null, {data: data})
      // Print a message after the library code
      console.log('<<<<<<<<<<<')
      return result
    }
  }
})
mysuperlibrary.print()
```

While the original `print` function was only printing `Hello` to stdout, the introduction of this new plugin prints:

```
>>>>>>>>>>>
Hello world
<<<<<<<<<<<
```

## API

The package exports a function to create a new instance:

```
const plugandplay = require('plug-and-play')

const plugins = plugandplay()
```

It accepts an option object with the properties:

* `args` ([string])   
  Arguments to pass to the plugin when they are instantiated, only apply if the plugin is defined as a function.
* `chain` (any)   
  The value returned by Plug-And-Play `register` function, default to the Plug-And-Play instance.
* `parent` (plugandplay)   
  A parent instance of Plug-And-Play to inherit plugins from.
* `plugins` ([plugin])   
  List of plugins to register

### Plugin object

A plugin is an object literal with the properties:

* `hooks` ({name: hook})   
  List of hooks identified by hook names.
* `name` (string)   
  Name of the plugin.

Alternatively, a plugin can be defined as a function which return the same plugin object and receive the `args` property from the Plug-And-Play function.

### Hook object

A hook is an object literal with the properties:

* `after` ([string])   
  List of plugin names with hook of the same name are to be executed before, a string is coerced to an array.
* `name` (string)   
  The name of the hook.
* `before` ([string])   
  List of plugin names with hook of the same name are to be executed after, a string is coerced to an array.

Note, when referencing plugins with `after` and `before`, the plugins do not need to exists. If they do, they are required to export a hook of the same name.

### Call function

The function signature is:

```
call({args = [], handler, hooks = [], name})
```

Execute a hander function and its associated hooks. The first argument is an object with the properties:

* `args` (any)
  The argument pass to the handler function as well as all hook handlers
* `handler` (function)   
  The function to decorate, receive the value assocaited with the `args` property.
* `name` (string)   
  The name of the hook to execute.
* `hooks` ([hook])   
  List of completary hooks from the end user.

### Get function

The function signature is:

```
get({name, hooks, sort})
```

The `get` function return hooks. It expects a property `option` which is a literal object with the properties:

* `name` (string)   
  The name of the hook.
* `hooks` ([hook])
  List of completary hooks from the end user.
* `sort` (boolean)   
  Sort the hooks relatively to each other using the `after` and `before` properties.

### Register function

The function signature is:

```
register(plugin)
```

Plugin can be provided when instantiating Plug-And-Play by passing the `plugins` property or they can be provided later on by calling the `register` function. The function only accept one argument, the `plugin` property:

* `plugin` (plugin)   
  A plugin object.

### Registed function

The function signature is:

```
registered(name)
```

Check if a plugin is registered.

## Roadmap

Worth considering: move the `name` property of `get` and `call` into the first argument and move the other properties into a second argument named option.
