const plugandplay = require('../lib')

module.exports = {
  // Create and export a new Plug and Play instance
  plugins: plugandplay(),
  // Our core library function
  print: function() {
    // Wrap-up code
    module.exports.plugins.call({
      // Identify this hook with a name
      name: 'hooks:print',
      // Expose arguments to plugins authors
      args: {
        data: { message: 'hello' }
      },
      // Default implementation
      handler: ({data}) => {
        // Original library
        console.log(data.message)
      }
    })
  }
}
