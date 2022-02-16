import { is_object_literal, is_object, merge } from 'mixme';
import toposort from 'toposort';

const PlugableError = class PlugableError extends Error {
  constructor(code, message, ...contexts) {
    var context, i, key, len, value;
    if (Array.isArray(message)) {
      message = message.filter(function (line) {
        return !!line;
      }).join(' ');
    }
    message = `${code}: ${message}`;
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PlugableError);
    }
    this.code = code;
    for (i = 0, len = contexts.length; i < len; i++) {
      context = contexts[i];
      for (key in context) {
        if (key === 'code') {
          continue;
        }
        value = context[key];
        if (value === void 0) {
          continue;
        }
        this[key] = Buffer.isBuffer(value) ? value.toString() : value === null ? value : JSON.parse(JSON.stringify(value));
      }
    }
  }
};
var error = (function () {
  return new PlugableError(...arguments);
});

const array_flatten = function (items, depth = -1) {
  const result = [];
  for (const item of items) {
    if (Array.isArray(item)) {
      if (depth === 0) {
        result.push(...item);
      }
      else {
        result.push(...array_flatten(item, depth - 1));
      }
    }
    else {
      result.push(item);
    }
  }
  return result;
};

const normalize_hook = function(name, hook) {
  if (!Array.isArray(hook)) {
    hook = [hook];
  }
  return hook.map(function(hook) {
    if (typeof hook === 'function') {
      hook = {
        handler: hook
      };
    } else if (!is_object(hook)) {
      throw error('PLUGINS_HOOK_INVALID_HANDLER', ['no hook handler function could be found,', 'a hook must be defined as a function', 'or as an object with an handler property,', `got ${JSON.stringify(hook)} instead.`]);
    }
    hook.name = name;
    if (typeof hook.after === 'string') {
      hook.after = [hook.after];
    }
    if (typeof hook.before === 'string') {
      hook.before = [hook.before];
    }
    return hook;
  });
};

const errors = {
  PLUGINS_HOOK_AFTER_INVALID: function({name, plugin, after}) {
    throw error('PLUGINS_HOOK_AFTER_INVALID', [`the hook ${JSON.stringify(name)}`, plugin ? `in plugin ${JSON.stringify(plugin)}` : void 0, 'references an after dependency', `in plugin ${JSON.stringify(after)} which does not exists`]);
  },
  PLUGINS_HOOK_BEFORE_INVALID: function({name, plugin, before}) {
    throw error('PLUGINS_HOOK_BEFORE_INVALID', [`the hook ${JSON.stringify(name)}`, plugin ? `in plugin ${JSON.stringify(plugin)}` : void 0, 'references a before dependency', `in plugin ${JSON.stringify(before)} which does not exists`]);
  }
};

const plugandplay = function({args, chain, parent, plugins = []} = {}) {
  // Internal plugin store
  const store = [];
  // Public API definition
  const registry = {
    // Register new plugins
    register: function(plugin) {
      if (typeof plugin === 'function') {
        plugin = plugin.apply(null, args);
      }
      if (!is_object_literal(plugin)) {
        throw error('PLUGINS_REGISTER_INVALID_ARGUMENT', ['a plugin must be an object literal or a function return this object', 'with keys such as `name`, `required` and `hooks`,', `got ${JSON.stringify(plugin)} instead.`]);
      }
      if (plugin.hooks == null) {
        plugin.hooks = {};
      }
      for (let name in plugin.hooks) {
        plugin.hooks[name] = normalize_hook(name, plugin.hooks[name]);
      }
      store.push(plugin);
      return chain || this;
    },
    get: function({name, hooks = [], sort = true}) {
      hooks = [
        ...normalize_hook(name, hooks),
        ...array_flatten(
          store.map(function(plugin){
            if(!plugin.hooks[name]) return;
            return plugin.hooks[name].map(function(hook){
              return merge({
                plugin: plugin.name
              }, hook);
            });
          })
            .filter(function(hook){return hook !== undefined;})
        ),
        ...(parent ? parent.get({
          name: name,
          sort: false
        }) : [])
      ];
      if (!sort) {
        return hooks;
      }
      // Topological sort
      const index = {};
      for(const hook of hooks){
        index[hook.plugin] = hook;
      }
      const edges_after = hooks
        .map(function(hook){
          if(!hook.after) return;
          return hook.after.map(function(after){
          // This check assume the plugin has the same hooks which is not always the case
            if(!index[after]){
              throw errors.PLUGINS_HOOK_AFTER_INVALID({
                name: name,
                plugin: hook.plugin,
                after: after
              });
            }
            return [index[after], hook];
          });
        }).filter(function(hook){return hook !== undefined;});
      const edges_before = hooks
        .map(function(hook){
          if(!hook.before) return;
          return hook.before.map(function(before){
            if(!index[before]){
              throw errors.PLUGINS_HOOK_BEFORE_INVALID({
                name: name,
                plugin: hook.plugin,
                before: before
              });
            }
            return [hook, index[before]];
          });
        }).filter(function(hook){return hook !== undefined;});
      const edges = array_flatten([...edges_after, ...edges_before], 0);
      return toposort.array(hooks, edges);
    },
    // Call a hook against each registered plugin matching the hook name
    call: async function({args = [], handler, hooks = [], name}) {
      if (arguments.length !== 1) {
        throw error('PLUGINS_INVALID_ARGUMENTS_NUMBER', ['function `call` expect 1 object argument,', `got ${arguments.length} arguments.`]);
      } else if (!is_object_literal(arguments[0])) {
        throw error('PLUGINS_INVALID_ARGUMENT_PROPERTIES', ['function `call` expect argument to be a literal object', 'with the properties `name`, `args`, `hooks` and `handler`,', `got ${JSON.stringify(arguments[0])} arguments.`]);
      } else if (typeof name !== 'string') {
        throw error('PLUGINS_INVALID_ARGUMENT_NAME', ['function `call` requires a property `name` in its first argument,', `got ${JSON.stringify(arguments[0])} argument.`]);
      }
      // Retrieve the name hooks
      hooks = this.get({
        hooks: hooks,
        name: name
      });
      // Call the hooks
      for(const hook of hooks){
        switch (hook.handler.length) {
        case 0:
        case 1:
          await hook.handler.call(this, args);
          break;
        case 2:
          handler = (await hook.handler.call(this, args, handler));
          if (handler === null) {
            return null;
          }
          break;
        default:
          throw error('PLUGINS_INVALID_HOOK_HANDLER', ['hook handlers must have 0 to 2 arguments', `got ${hook.handler.length}`]);
        }
      }
      if (handler) {
        // Call the final handler
        return handler.call(this, args);
      }
    },
    // Call a hook against each registered plugin matching the hook name
    call_sync: function({args = [], handler, hooks = [], name}) {
      if (arguments.length !== 1) {
        throw error('PLUGINS_INVALID_ARGUMENTS_NUMBER', ['function `call` expect 1 object argument,', `got ${arguments.length} arguments.`]);
      } else if (!is_object_literal(arguments[0])) {
        throw error('PLUGINS_INVALID_ARGUMENT_PROPERTIES', ['function `call` expect argument to be a literal object', 'with the properties `name`, `args`, `hooks` and `handler`,', `got ${JSON.stringify(arguments[0])} arguments.`]);
      } else if (typeof name !== 'string') {
        throw error('PLUGINS_INVALID_ARGUMENT_NAME', ['function `call` requires a property `name` in its first argument,', `got ${JSON.stringify(arguments[0])} argument.`]);
      }
      // Retrieve the name hooks
      hooks = this.get({
        hooks: hooks,
        name: name
      });
      // Call the hooks
      for(const hook of hooks) {
        switch (hook.handler.length) {
        case 0:
        case 1:
          hook.handler.call(this, args);
          break;
        case 2:
          handler = hook.handler.call(this, args, handler);
          if (handler === null) {
            return null;
          }
          break;
        default:
          throw error('PLUGINS_INVALID_HOOK_HANDLER', ['hook handlers must have 0 to 2 arguments', `got ${hook.handler.length}`]);
        }
      }
      if (handler) {
        // Call the final handler
        return handler.call(this, args);
      }
    }
  };
  // Register initial plugins
  for(const plugin of plugins){
    registry.register(plugin);
  }
  // return the object
  return registry;
};

export { plugandplay };
