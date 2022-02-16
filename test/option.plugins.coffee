
import plugandplay from '../lib/index.js'

describe 'plugandplay.option.plugin', ->

  it 'instantiate with plugin objects', ->
    plugandplay
      plugins: [
        hooks: 'my:hook': -> 1
      ,
        hooks: 'my:hook': -> 2
      ]
    # Test the registered hooks
    .get name: 'my:hook'
    .map((hook) -> hook.handler.call()).should.eql [1, 2]

  it 'instantiate with plugin functions', ->
    plugandplay
      plugins: [
        -> hooks: 'my:hook': -> 1
      ,
        -> hooks: 'my:hook': -> 2
      ]
    # Test the registered hooks
    .get name: 'my:hook'
    .map((hook) -> hook.handler.call()).should.eql [1, 2]
