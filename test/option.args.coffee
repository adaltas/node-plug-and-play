
plugandplay = require '../lib'

describe 'option.args', ->

  it 'with option.plugin', ->
    plugandplay
      args: ['a', 'b']
      plugins: [
        (a, b) ->
          hooks: 'my:hook': -> [a, b]
      ]
    # Test the registered hooks
    .get name: 'my:hook'
    .map((hook) -> hook.handler.call()).should.eql [['a', 'b']]

  it 'with register', ->
    plugandplay
      args: ['a', 'b']
    .register (a, b) ->
      hooks: 'my:hook': -> [a, b]
    # Test the registered hooks
    .get name: 'my:hook'
    .map((hook) -> hook.handler.call()).should.eql [['a', 'b']]
