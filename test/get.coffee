
plugandplay = require '../src'

describe 'plugandplay.get', ->

  it 'root level', ->
    plugins = plugandplay()
    plugins.register hooks: 'my:hook': -> 1
    plugins.register hooks: 'my:hook': -> 2
    plugins.get name: 'my:hook'
    .map((hook) -> hook.handler.call()).should.eql [1, 2]

  it 'with parent', ->
    parent = plugandplay()
    parent.register hooks: 'my:hook': -> 3
    child = plugandplay parent: parent
    child.register hooks: 'my:hook': -> 1
    child.register hooks: 'my:hook': -> 2
    child.get name: 'my:hook'
    .map((hook) -> hook.handler.call()).should.eql [1, 2, 3]

  it 'after and before as function', ->
    plugins = plugandplay()
    plugins.register module: 'module/after', hooks: 'my:hook': (->)
    plugins.register module: 'module/before', hooks: 'my:hook': (->)
    plugins.register
      module: 'module/origin'
      hooks: 'my:hook':
        after: 'module/after', before: 'module/before'
        handler: (->)
    plugins.get name: 'my:hook'
    .map (hook) -> hook.module
    .should.eql [
      'module/after', 'module/origin', 'module/before'
    ]
  
  describe 'errors', ->

    it 'when plugin exists but no matching hook is exposed', ->
      (->
        plugins = plugandplay()
        plugins.register name: 'module/after'
        plugins.register
          hooks: 'my:hook':
            after: 'module/after'
            handler: (->)
        plugins.get name: 'my:hook'
      ).should.throw [
        'PLUGINS_HOOK_AFTER_INVALID:'
        'the hook "my:hook"'
        'references an after dependency'
        'in plugin "module/after" which does not exists'
      ].join ' '

    it 'when plugin does not exists', ->
      (->
        plugins = plugandplay()
        plugins.register
          hooks: 'my:hook':
            before: 'module/before'
            handler: (->)
        plugins.get name: 'my:hook'
      ).should.throw [
        'PLUGINS_HOOK_BEFORE_INVALID:'
        'the hook "my:hook"'
        'references a before dependency'
        'in plugin "module/before" which does not exists'
      ].join ' '
