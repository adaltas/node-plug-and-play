
plugandplay = require '../src'

describe 'plugandplay.hook', ->
  
  describe 'handler arguments', ->
    
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
      count = 0
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': ( (a, b, c) -> )
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
        args: {}
        handler: (args) ->
          ['origin']
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
        args: {}
        handler: (args) ->
          ['origin']
      .should.be.resolvedWith ['origin', 'alter_1', 'alter_2']

  describe 'errors', ->

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

    it 'object must contains `name` and be a stirng', ->
      plugandplay()
      .call
        name: 123
        handler: (->)
      .should.be.rejectedWith
        code: 'PLUGINS_INVALID_ARGUMENT_NAME'
      
        
