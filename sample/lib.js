
import {plugandplay} from 'plug-and-play';

// Create and export a new Plug and Play instance
const plugins = plugandplay();
// Our core library function
const print = function() {
  // Wrap-up code
  plugins.call({
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
};

export {plugins, print};
