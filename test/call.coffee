
plugandplay = require '../src'

describe 'plugandplay.hook', ->

  it 'hook handler alter args with 1 argument', ->
    plugins = plugandplay()
    plugins.register hooks: 'my:hook': (test) ->
      test.a_key = 'a value'
    test = {}
    await plugins.call
      name: 'my:hook'
      args: test
      handler: (->)
    test.a_key.should.eql 'a value'

  it 'hook handler alter args', ->
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

  it 'hook handler alter args async', ->
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

  it 'call handler and alter result sync', ->
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

  it 'call handler and alter result async', ->
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
      
        
