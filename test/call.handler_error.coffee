
plugandplay = require '../lib'

describe 'plugandplay.call.handler_error', ->

  it 'thrown error, no handler', ->
    plugins = plugandplay
      plugins: [
        name: 'my:plugin'
        hooks: 'my:hook':
          handler: (args) ->
            throw Error args
      ]
    plugins.call
      name: 'my:hook'
      args: 'catchme'
      handler: ->
        new Promise (resolve) -> setImmediate resolve
    .should.be.rejectedWith 'catchme'

  it 'throw `ReferenceError: not defined` error, no handler', ->
    plugins = plugandplay
      plugins: [
        name: 'my:plugin'
        hooks: 'my:hook':
          handler: (args) ->
            catchme()
      ]
    plugins.call
      name: 'my:hook'
      handler: ->
        new Promise (resolve) -> setImmediate resolve
    .should.be.rejectedWith /not defined/

  it 'throw error, before handler', ->
    plugins = plugandplay
      plugins: [
        name: 'my:plugin'
        hooks: 'my:hook':
          handler: (args, handler) ->
            throw Error args
      ]
    plugins.call
      name: 'my:hook'
      args: 'catchme'
      handler: ->
        new Promise (resolve) -> setImmediate resolve
    .should.be.rejectedWith 'catchme'

  it 'throw error in returned handler, before parent handler', ->
    plugins = plugandplay
      plugins: [
        name: 'my:plugin'
        hooks: 'my:hook':
          handler: (args, handler) ->
            ->
              throw Error args
      ]
    plugins.call
      name: 'my:hook'
      args: 'catchme'
      handler: ->
        new Promise (resolve) -> setImmediate resolve
    .should.be.rejectedWith 'catchme'

  it 'throw error in returned handler, after parent handler', ->
    plugins = plugandplay
      plugins: [
        name: 'my:plugin'
        hooks: 'my:hook':
          handler: (args, handler) ->
            ->
              await handler.apply null, []
              throw Error args
      ]
    plugins.call
      name: 'my:hook'
      args: 'catchme'
      handler: ->
        new Promise (resolve) -> setImmediate resolve
    .should.be.rejectedWith 'catchme'

  it 'throw `ReferenceError: not defined` error in returned handler, after parent handler', ->
    plugins = plugandplay
      plugins: [
        name: 'my:plugin'
        hooks: 'my:hook':
          handler: (args, handler) ->
            ->
              await handler.apply null, []
              catchme()
      ]
    plugins.call
      name: 'my:hook'
      handler: ->
        new Promise (resolve) -> setImmediate resolve
    .should.be.rejectedWith /not defined/
