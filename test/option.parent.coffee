
import plugandplay from '../lib/index.js'

describe 'option.parent', ->

  it 'call child then parent hooks', ->
    parent = plugandplay()
    parent.register hooks: 'my:hook': -> 3
    child = plugandplay parent: parent
    child.register hooks: 'my:hook': -> 1
    child.register hooks: 'my:hook': -> 2
    child.get name: 'my:hook'
    .map((hook) -> hook.handler.call()).should.eql [1, 2, 3]
