
[![Build Status](https://secure.travis-ci.org/adaltas/node-plugable.svg)](http://travis-ci.org/adaltas/node-plugable)

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

## Tutorial

### 8. Nested/hierarchical architecture

Plugin instances can be nested, which mean that an interception point can call registered hooks in the current instance as well as in its parents. Parents are defined on plugin initialization by passing the `parent` property:

```js
const plugable = require('plugable')
// Initialize a parent and register a hook
const parent = plugable()
parent.register({
  hooks: {
    'app:test': () => {
      console.log('call parent')
    }
  }
})
// Initialize a child referencing a parent and register a hook
const child = plugable({
  parent: parent
})
parent.register({
  hooks: {
    'app:test': () => {
      console.log('call child')
    }
  }
})
// Call the hook
child.hook({
  event: 'my:hook'
  args: {}
  handler: function(){}
})
```
