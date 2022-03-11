
import {plugandplay} from '../lib/index.js'

describe 'plugandplay.call_sync', ->
  
  describe 'api', ->

    it 'expect 1 argument', ->
      (->
        plugandplay()
        .call_sync {}, {}
      ).should.throw code: 'PLUGINS_INVALID_ARGUMENTS_NUMBER'

    it 'argument must a an object', ->
      (->
        plugandplay()
        .call_sync []
      ).should.throw code: 'PLUGINS_INVALID_ARGUMENT_PROPERTIES'

    it 'object must contains `name` and be a string', ->
      (->
        plugandplay()
        .call_sync
          name: 123
          handler: (->)
      ).should.throw code: 'PLUGINS_INVALID_ARGUMENT_NAME'
    
    it 'no aguments', ->
      count = 0
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': ->
        count++
      await plugins.call_sync
        name: 'my:hook'
        handler: (->)
      count.should.eql 1
    
    it 'more than 2 arguments', ->
      (->
        plugins = plugandplay()
        plugins.register hooks: 'my:hook': ( (a, b, c) -> [a, b, c] )
        plugins.call_sync
          name: 'my:hook'
          handler: (->)
      ).should.throw
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
      plugins.call_sync
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
      plugins.call_sync
        name: 'my:hook'
        args: test
        handler: (->)
      test.a_key.should.eql 'a value'

  describe 'stop with null', ->

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
      plugins.call_sync
        name: 'my:hook'
        args: ar
        handler: (ar) ->
          ar.push 'origin'
      ar.should.eql ['hook 1', 'hook 2']

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
      plugins.call_sync
        name: 'my:hook'
        args: ['origin']
        handler: (args) -> args
      .should.eql ['origin', 'alter_1', 'alter_2']
        
      
        
