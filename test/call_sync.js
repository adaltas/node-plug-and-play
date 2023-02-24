import {plugandplay} from '../dist/esm/index.js'

describe("plugandplay.call_sync", () => {

  describe("api", () => {


    it('expect 1 argument', () => {
      (() => {
        plugandplay()
        .call_sync({}, {});
      }).should.throw({code: 'PLUGINS_INVALID_ARGUMENTS_NUMBER'})
    })

    it( 'argument must a an object', () => {
      (() =>
        plugandplay()
        .call_sync([])
      ).should.throw({code: 'PLUGINS_INVALID_ARGUMENT_PROPERTIES'})
    })

    it('object must contains `name` and be a string', () => {
      (() =>
        plugandplay()
        .call_sync({
          name: 123,
          handler: () => {}
        })
      ).should.throw({code: 'PLUGINS_INVALID_ARGUMENT_NAME'})
    })
    
    it( 'more than 2 arguments', () => {
      (() => {
        const plugins = plugandplay()
        plugins.register({
          name: 'my_plugin',
          hooks: {
            'my:hook': (a, b, c) => [a, b, c]
          }
        })
        plugins.call_sync({
          name: 'my:hook',
          handler: () => {},
          args: {}
        })
      }).should.throw({
        code: 'PLUGINS_INVALID_HOOK_HANDLER',
        message: [
          'PLUGINS_INVALID_HOOK_HANDLER:',
          'hook handlers must have 0 to 2 arguments',
          "got 3"
        ].join(' ')
      })
    })
    
  })

});
