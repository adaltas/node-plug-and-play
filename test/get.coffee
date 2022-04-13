
import {plugandplay} from '../lib/index.js'

describe 'plugandplay.get', ->
  
  describe 'option `name`', ->
    
    it 'root level', ->
      plugins = plugandplay()
      plugins.register hooks: 'my:hook': -> 1
      plugins.register hooks: 'my:hook': -> 2
      plugins.register hooks: 'another:hook': -> 2
      plugins.get name: 'my:hook'
      .map((hook) -> hook.handler.call()).should.eql [1, 2]

    it 'after and before as function', ->
      plugins = plugandplay()
      plugins.register name: 'module/after', hooks: 'my:hook': (->)
      plugins.register name: 'module/before', hooks: 'my:hook': (->)
      plugins.register
        name: 'module/origin'
        hooks: 'my:hook':
          after: 'module/after'
          before: 'module/before'
          handler: (->)
      plugins.get name: 'my:hook'
      .map (hook) -> hook.plugin
      .should.eql [
        'module/after', 'module/origin', 'module/before'
      ]

    it 'refer to an optional and missing dependency', ->
      plugins = plugandplay()
      plugins.register
        name: 'module/origin'
        hooks: 'my:hook':
          after: 'module/after'
          before: 'module/before'
          handler: (->)
      plugins.get name: 'my:hook'
      .map (hook) -> hook.plugin
      .should.eql [
        'module/origin'
      ]
  
  describe 'require', ->

    it 'refer to registered plugin', ->
      plugins = plugandplay()
      plugins.register
        name: 'module/required'
      plugins.register
        name: 'module/parent'
        require: 'module/required'
        hooks: 'my:hook':
          handler: (->)
      plugins.get name: 'my:hook'

    it 'refer to unregistered plugin', ->
      plugins = plugandplay()
      plugins.register
        name: 'module/parent'
        require: 'module/required'
        hooks: 'my:hook':
          handler: (->)
      ( ->
        plugins.get name: 'my:hook'
      ).should.throw 'REQUIRED_PLUGIN: the plugin "module/parent" requires a plugin named "module/required" which is not unregistered.'
  
  describe 'errors', ->

    it 'after plugin exists but contains no hooks', ->
      (->
        plugins = plugandplay()
        plugins.register
          name: 'module/after'
        plugins.register
          hooks: 'my:hook':
            after: 'module/after'
            handler: (->)
        plugins.get name: 'my:hook'
      ).should.throw [
        'PLUGINS_HOOK_AFTER_INVALID:'
        'the hook "my:hook"'
        'references an after dependency'
        'in plugin "module/after" which does not exists.'
      ].join ' '

    it 'before plugin exists but contains no matching hooks', ->
      (->
        plugins = plugandplay()
        plugins.register
          name: 'module/before'
          hooks: 'non:matching:hook':
            handler: (->)
        plugins.register
          hooks: 'my:hook':
            before: 'module/before'
            handler: (->)
        plugins.get name: 'my:hook'
      ).should.throw [
        'PLUGINS_HOOK_BEFORE_INVALID:'
        'the hook "my:hook"'
        'references a before dependency'
        'in plugin "module/before" which does not exists.'
      ].join ' '
