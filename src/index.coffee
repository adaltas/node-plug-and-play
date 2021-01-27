
{is_object_literal, is_object, merge} = require 'mixme'
toposort = require 'toposort'
error = require './error'
{array_flatten} = require './utils'

normalize_hook = (name, hook) ->
  hook = [hook] unless Array.isArray hook
  hook.map (hook) ->
    if typeof hook is 'function'
      hook = handler: hook
    else if not is_object hook
      throw error 'PLUGINS_HOOK_INVALID_HANDLER', [
        'no hook handler function could be found,'
        'a hook must be defined as a function'
        'or as an object with an handler property,'
        "got #{JSON.stringify hook} instead."
      ]
    hook.name = name
    # hook.after ?= []
    hook.after = [hook.after] if typeof hook.after is 'string'
    # hook.before ?= []
    hook.before = [hook.before] if typeof hook.before is 'string'
    hook

module.exports = ({args, chain, parent, plugins = []} = {}) ->
  # Internal plugin store
  store = []
  # Public API definition
  obj =
    # Register new plugins
    register: (plugin) ->
      plugin = plugin.apply null, args if typeof plugin is 'function'
      throw error('PLUGINS_REGISTER_INVALID_ARGUMENT', [
        'a plugin must be an object literal or a function return this object'
        'with keys such as `name`, `required` and `hooks`,'
        "got #{JSON.stringify plugin} instead."
      ]) unless is_object_literal plugin
      plugin.hooks ?= {}
      for name, hook of plugin.hooks
        plugin.hooks[name] = normalize_hook name, hook
      store.push plugin
      chain or @
    get: ({name, hooks = [], sort = true}) ->
      hooks = [
        ...normalize_hook name, hooks
        ...array_flatten( for plugin in store
          continue unless plugin.hooks[name]
          for hook in plugin.hooks[name]
            merge
              plugin: plugin.name
            , hook
        )
        ...if parent
        then parent.get name: name, sort: false
        else []
      ]
      return hooks unless sort
      # Topological sort
      index = {}
      index[hook.plugin] = hook for hook in hooks
      edges_after = for hook in hooks
        continue unless hook.after
        for after in hook.after
          # This check assume the plugin has the same hooks which is not always the case
          unless index[after]
            throw errors.PLUGINS_HOOK_AFTER_INVALID
              name: name, plugin: hook.plugin, after: after
          [index[after], hook]
      edges_before = for hook in hooks
        continue unless hook.before
        for before in hook.before
          unless index[before]
            throw errors.PLUGINS_HOOK_BEFORE_INVALID
              name: name, plugin: hook.plugin, before: before
          [hook, index[before]]
      edges = [...edges_after, ...edges_before]
      edges = array_flatten edges, 0
      toposort.array hooks, edges
    # Call a hook against each registered plugin matching the hook name
    call: ({args = [], handler, hooks = [], name})->
      if arguments.length isnt 1
        throw error 'PLUGINS_INVALID_ARGUMENTS_NUMBER', [
          'function `call` expect 1 object argument,'
          "got #{arguments.length} arguments."
        ]
      else unless is_object_literal arguments[0]
        throw error 'PLUGINS_INVALID_ARGUMENT_PROPERTIES', [
          'function `call` expect argument to be a literal object'
          'with the properties `name`, `args`, `hooks` and `handler`,'
          "got #{JSON.stringify arguments[0]} arguments."
        ]
      else unless typeof name is 'string'
        throw error 'PLUGINS_INVALID_ARGUMENT_NAME', [
          'function `call` requires a property `name` in its first argument,'
          "got #{JSON.stringify arguments[0]} argument."
        ]
      # Retrieve the name hooks
      hooks = this.get hooks: hooks, name: name
      # Call the hooks
      for hook in hooks
        switch hook.handler.length
          when 1 then await hook.handler.call @, args
          when 2 then handler = await hook.handler.call @, args, handler
      # Call the final handler
      handler.call @, args if handler
  # Register initial plugins
  for plugin in plugins
    obj.register plugin
  # return the object
  obj

errors =
  PLUGINS_HOOK_AFTER_INVALID: ({name, plugin, after}) ->
    throw error 'PLUGINS_HOOK_AFTER_INVALID', [
      "the hook #{JSON.stringify name}"
      "in plugin #{JSON.stringify plugin}" if plugin
      'references an after dependency'
      "in plugin #{JSON.stringify after} which does not exists"
    ]
  PLUGINS_HOOK_BEFORE_INVALID: ({name, plugin, before}) ->
    throw error 'PLUGINS_HOOK_BEFORE_INVALID', [
      "the hook #{JSON.stringify name}"
      "in plugin #{JSON.stringify plugin}" if plugin
      'references a before dependency'
      "in plugin #{JSON.stringify before} which does not exists"
    ]
