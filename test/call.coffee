
import {plugandplay} from '../lib/index.js'

describe 'plugandplay.call', ->
  
  describe 'api', ->

    it 'expect 1 argument', ->
      plugandplay()
      .call {}, {}
      .should.be.rejectedWith
        code: 'PLUGINS_INVALID_ARGUMENTS_NUMBER'

    it 'argument must a an object', ->
      plugandplay()
      .call []
      .should.be.rejectedWith
        code: 'PLUGINS_INVALID_ARGUMENT_PROPERTIES'

    it 'object must contains `name` and be a string', ->
      plugandplay()
      .call
        name: 123
        handler: (->)
      .should.be.rejectedWith
        code: 'PLUGINS_INVALID_ARGUMENT_NAME'
    
    it 'no aguments', ->
      count = 0
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': ->
        count++
      await plugins.call
        name: 'my:hook'
        handler: (->)
      count.should.eql 1
    
    it 'more than 2 arguments', ->
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': ( (a, b, c) -> [a, b, c] )
      plugins.call
        name: 'my:hook'
        handler: (->)
      .should.be.rejectedWith
        code: 'PLUGINS_INVALID_HOOK_HANDLER'
        message: [
          'PLUGINS_INVALID_HOOK_HANDLER:'
          'hook handlers must have 0 to 2 arguments'
          "got 3"
        ].join ' '
  
  describe 'property `args`', ->
    
    it 'is passed to handlers', ->
      stack = []
      plugins = plugandplay
        plugins: [
          hooks: 'my:hook': (args) ->
            stack.push args
        ,
          hooks: 'my:hook': (args, handler) ->
            stack.push args
            handler
        ]
      await plugins.call
        name: 'my:hook'
        args: a_key: 'a_value'
        handler: (args) ->
          stack.push args
      stack.should.eql [
        { a_key: 'a_value' }
        { a_key: 'a_value' }
        { a_key: 'a_value' }
      ]
  
  describe 'handler alter args', ->

    it 'synch handler without handler argument', ->
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': (test) ->
        # Alter `test` with `a_key`
        test.a_key = 'a value'
      test = {}
      await plugins.call
        name: 'my:hook'
        args: test
        handler: (->)
      test.a_key.should.eql 'a value'

    it 'synch handler with handler argument', ->
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': (test, handler) ->
        test.a_key = 'a value'
        handler
      test = {}
      await plugins.call
        name: 'my:hook'
        args: test
        handler: (->)
      test.a_key.should.eql 'a value'

    it 'async handler with handler argument', ->
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': (ar, handler) ->
        ar.push 'alter 1'
        await new Promise (resolve) -> setImmediate resolve
        handler
      plugins.register hooks: 'my:hook': (ar, handler) ->
        ar.push 'alter 2'
        await new Promise (resolve) -> setImmediate resolve
        handler
      ar = []
      await plugins.call
        name: 'my:hook'
        args: ar
        handler: (ar) -> ar.push 'origin'
      ar.should.eql ['alter 1', 'alter 2', 'origin']

    it 'async handler unordered timeout', ->
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': (ar, handler) ->
        new Promise (resolve) -> setTimeout ->
         ar.push 'hook 1'
         resolve handler
        , 300
      plugins.register hooks: 'my:hook': (ar, handler) ->
        new Promise (resolve) -> setTimeout ->
         ar.push 'hook 2'
         resolve handler
        , 100
      ar = []
      await plugins.call
        name: 'my:hook'
        args: ar
        handler: (ar) ->
          new Promise (resolve) -> setTimeout ->
           ar.push 'origin'
           resolve()
          , 100
      ar.should.eql ['hook 1', 'hook 2', 'origin']
  
  describe 'alter result', ->

    it 'sync', ->
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': (test, handler) ->
        ->
          res = handler.apply null, arguments
          res.push 'alter_1'
          res
      plugins.register hooks: 'my:hook': (test, handler) ->
        ->
          res = handler.apply null, arguments
          res.push 'alter_2'
          res
      plugins.call
        name: 'my:hook'
        args: ['origin']
        handler: (args) -> args
      .should.be.resolvedWith ['origin', 'alter_1', 'alter_2']

    it 'async', ->
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': (test, handler) ->
        ->
          res = await handler.apply null, arguments
          res.push 'alter_1'
          await new Promise (resolve) -> setImmediate resolve
          res
      plugins.register hooks: 'my:hook': (test, handler) ->
        ->
          res = await handler.apply null, arguments
          res.push 'alter_2'
          await new Promise (resolve) -> setImmediate resolve
          res
      plugins.call
        name: 'my:hook'
        args: ['origin']
        handler: (args) -> args
      .should.be.resolvedWith ['origin', 'alter_1', 'alter_2']
  
  describe 'continue with `undefined`', ->

    it 'when `undefined` is returned, sync mode', ->
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': (ar, handler) ->
        ar.push 'hook 1', typeof handler
        handler
      plugins.register hooks: 'my:hook': (ar, handler) ->
        ar.push 'hook 2', typeof handler
        undefined
      plugins.register hooks: 'my:hook': (ar, handler) ->
        ar.push 'hook 3', typeof handler
        handler
      plugins.register hooks: 'my:hook': (ar, handler) ->
        ar.push 'hook 4', typeof handler
        handler
      ar = []
      await plugins.call
        name: 'my:hook'
        args: ar
        handler: (ar) ->
          ar.push 'origin'
      ar.should.eql [
        'hook 1', 'function'
        'hook 2', 'function'
        'hook 3', 'undefined'
        'hook 4', 'undefined'
      ]

  describe 'stop with `null`', ->

    it 'when `null` is returned, sync mode', ->
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': (ar, handler) ->
        ar.push 'hook 1'
        handler
      plugins.register hooks: 'my:hook': (ar, handler) -> # eslint-disable-line
        ar.push 'hook 2'
        null
      plugins.register hooks: 'my:hook': (ar, handler) ->
        ar.push 'hook 3'
        handler
      plugins.register hooks: 'my:hook': (ar, handler) ->
        ar.push 'hook 4'
        handler
      ar = []
      await plugins.call
        name: 'my:hook'
        args: ar
        handler: (ar) ->
          ar.push 'origin'
      ar.should.eql ['hook 1', 'hook 2']

    it 'when `null` is fulfilled, async mode', ->
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': (ar, handler) ->
        new Promise (resolve) -> setTimeout ->
          ar.push 'hook 1'
          resolve handler
        , 300
      plugins.register hooks: 'my:hook': (ar, handler) -> # eslint-disable-line
        new Promise (resolve) -> setTimeout ->
          ar.push 'hook 2'
          resolve null
        , 100
      plugins.register hooks: 'my:hook': (ar, handler) ->
        new Promise (resolve) -> setTimeout ->
          ar.push 'hook 3'
          resolve handler
        , 300
      ar = []
      await plugins.call
        name: 'my:hook'
        args: ar
        handler: (ar) ->
          new Promise (resolve) -> setTimeout ->
           ar.push 'origin'
           resolve()
          , 100
      ar.should.eql ['hook 1', 'hook 2']
      
        
