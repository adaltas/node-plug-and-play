
plugandplay = require '../src'

describe 'plugandplay.register', ->
  
  describe 'errors', ->

    it 'when plugin not an object but a function', ->
      (->
        plugandplay().register (->)
      ).should.throw [
        'PLUGINS_REGISTER_INVALID_ARGUMENT:'
        'a plugin must be an object literal'
        'with keys such as `name`, `required` and `hooks`,'
        'got a function instead.'
      ].join ' '

    it 'when hooks is neither a function nor a object literal', ->
      ( ->
        plugins = plugandplay()
        plugins.register hooks: 'my:hook': 'ohno'
      ).should.throw [
        'PLUGINS_HOOK_INVALID_HANDLER:'
        'no hook handler function could be found,'
        'a hook must be defined as a function or as an object with an handler property,'
        'got "ohno" instead.'
      ].join ' '
