
plugandplay = require '../src'

describe 'plugandplay.workflow', ->
  
  describe 'workflow', ->

    it 'break if handler return null handler', ->
      plugins = plugandplay
        plugins: [{
          name: 'parent'
          hooks: 'my:hook':
            handler: (_, handler) -> null
        },{
          name: 'child'
          hooks: 'my:hook':
            after: 'parent'
            handler: -> throw Error 'KO'
        }]
      result = await plugins.call
        name: 'my:hook'
        args: 'ok'
        handler: -> throw Error 'KO'
      should(result).be.exactly null
