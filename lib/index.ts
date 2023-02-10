import { is_object_literal, is_object, merge } from 'mixme';
import toposort from 'toposort';
import error from './error';

type HookHandler = (
  args: object,
  handler?: HookHandler
) => HookHandler | null | Promise<HookHandler>;

export interface Hook {
  /**
   * List of plugin names with hooks of the same name are to be executed after, a string is coerced to an array.
   */
  after?: string[];
  /**
   * List of plugin names with hooks of the same name are to be executed before, a string is coerced to an array.
   */
  before?: string[];
  /**
   * Name to indentify the hook.
   */
  name: string;
  /**
   * The hook handler to be executed.
   */
  handler: HookHandler;

  require?: string[];
  plugin?: string;
}

export interface Plugin {
  /**
   * List of hooks identified by hook names.
   */
  hooks: {
    [name: string]: Hook[];
  };
  /**
   * Name of the plugin.
   */
  name: string;
  /**
   * Names of the required plugins.
   */
  require: string[];
}

interface callArgs {
  /**
   * Argument passed to the handler function as well as all hook handlers.
   */
  args?: object;
  /**
   * Function to decorate, receive the value associated with the `args` property.
   */
  handler: HookHandler;
  /**
   * List of completary hooks from the end user.
   */
  hooks?: Hook[];
  /**
   * Name of the hook to execute.
   */
  name: string;
}

// type syncCallArgs = Omit<callArgs, 'handler'> & {
//   handler: SyncHookHandler;
// };

interface getArgs {
  /**
   * List of complementary hooks from the end user.
   */
  hooks?: Hook[];
  /**
   * Name of the hook to retrieve.
   */
  name: string;
  /**
   * Sort the hooks relatively to each other using the after and before properties.
   */
  sort?: boolean;
}

export interface Registry {
  /**
   * Execute a hander function and its associated hooks.
   */
  call: (args: callArgs) => Promise<unknown>;
  /**
   * Execute a hander function and its associated hooks, synchronously.
   */
  call_sync: (args: callArgs) => unknown;
  /**
   * Retrieves registered hooks.
   */
  get: (args: getArgs) => Hook[];
  /**
   * Registers a plugin
   * @remarks Plugin can be provided when instantiating Plug-And-Play by passing the plugins property or they can be provided later on by calling the register function.
   */
  register: (userPlugin: Plugin | ((args?: object) => Plugin)) => Registry;
  /**
   * Check if a plugin is registered.
   */
  registered: (name: string) => boolean;
}

export type plugangplayArgs = {
  args?: object;
  chain?: Registry;
  parent?: Registry;
  plugins?: Plugin[];
};

const normalize_hook = function (
  name: string,
  userHooks: Hook | Hook[]
): Hook[] {
  const hooks = !Array.isArray(userHooks) ? [userHooks] : userHooks;
  return hooks.map(function (userHook) {
    const hook: Partial<Hook> = {};

    if (typeof userHook === 'function') {
      hook.handler = userHook as HookHandler;
    } else if (!is_object(userHook) && Object.keys(userHook).length === 0) {
      throw error('PLUGINS_HOOK_INVALID_HANDLER', [
        'no hook handler function could be found,',
        'a hook must be defined as a function',
        'or as an object with an handler property,',
        `got ${JSON.stringify(hook)} instead.`,
      ]);
    }
    hook.name = name;
    if ('after' in userHook && typeof userHook.after === 'string') {
      hook.after = [userHook.after];
    }
    if ('before' in userHook && typeof userHook.before === 'string') {
      hook.before = [userHook.before];
    }
    return hook as Hook;
  });
};

const errors = {
  PLUGINS_HOOK_AFTER_INVALID: function ({
    name,
    plugin,
    after,
  }: {
    name: string;
    plugin: string;
    after: string;
  }) {
    throw error('PLUGINS_HOOK_AFTER_INVALID', [
      `the hook ${JSON.stringify(name)}`,
      plugin ? `in plugin ${JSON.stringify(plugin)}` : void 0,
      'references an after dependency',
      `in plugin ${JSON.stringify(after)} which does not exists.`,
    ]);
  },
  PLUGINS_HOOK_BEFORE_INVALID: function ({
    name,
    plugin,
    before,
  }: {
    name: string;
    plugin: string;
    before: string;
  }) {
    throw error('PLUGINS_HOOK_BEFORE_INVALID', [
      `the hook ${JSON.stringify(name)}`,
      plugin ? `in plugin ${JSON.stringify(plugin)}` : void 0,
      'references a before dependency',
      `in plugin ${JSON.stringify(before)} which does not exists.`,
    ]);
  },
  REQUIRED_PLUGIN: function ({
    plugin,
    require,
  }: {
    plugin: string;
    require: string;
  }) {
    throw error('REQUIRED_PLUGIN', [
      `the plugin ${JSON.stringify(plugin)}`,
      'requires a plugin',
      `named ${JSON.stringify(require)} which is not registered.`,
    ]);
  },
  PLUGINS_REGISTER_INVALID_REQUIRE: function ({
    name,
    require,
  }: {
    name: string;
    require: string;
  }) {
    throw error('PLUGINS_REGISTER_INVALID_REQUIRE', [
      'the `require` property',
      name ? `in plugin ${JSON.stringify(name)}` : void 0,
      'must be a string or an array,',
      `got ${JSON.stringify(require)}.`,
    ]);
  },
};

type NormalizedPlugin = Plugin & {
  hooks: {
    [name: string]: Hook[];
  };
};

const plugandplay = function ({
  args,
  chain,
  parent,
  plugins = [],
}: plugangplayArgs = {}): Registry {
  // Internal plugin store
  const store: NormalizedPlugin[] = [];
  // Public API definition
  const registry: Registry = {
    register: function (userPlugin) {
      if (typeof userPlugin === 'function') {
        return this.register(userPlugin(args));
      } else {
        const plugin: Partial<Plugin> = {};
        if (
          !(
            is_object_literal(plugin) &&
            'name' in userPlugin &&
            typeof userPlugin.name === 'string'
          )
        ) {
          throw error('PLUGINS_REGISTER_INVALID_ARGUMENT', [
            'a plugin must be an object literal or a function returning an object literal',
            'with keys such as `name`, `required` and `hooks`,',
            `got ${JSON.stringify(plugin)} instead.`,
          ]);
        }
        plugin.name = userPlugin.name;
        plugin.hooks = {};
        if ('hooks' in plugin && is_object(plugin.hooks)) {
          for (const name in plugin.hooks) {
            plugin.hooks[name] = normalize_hook(name, plugin.hooks[name]);
          }
        }
        plugin.require = [];
        if ('require' in plugin) {
          if (typeof plugin.require === 'string') {
            plugin.require = [plugin.require];
          }
          if (!Array.isArray(plugin.require)) {
            throw errors.PLUGINS_REGISTER_INVALID_REQUIRE({
              name: plugin.name,
              require: plugin.require,
            });
          }
        }

        store.push(plugin as NormalizedPlugin);
        return chain || this;
      }
    },
    registered: function (name) {
      for (const plugin of store) {
        if (plugin.name === name) {
          return true;
        }
      }
      if (parent != null && parent.registered(name)) {
        return true;
      }
      return false;
    },
    get: function ({ name, hooks = [], sort = true }) {
      const mergedHooks = [
        ...normalize_hook(name, hooks),
        ...(store
          .map(function (plugin) {
            // Only filter plugins with the requested hook
            if (!plugin.hooks[name]) return;
            // Validate plugin requirements
            if (plugin.require) {
            for (const require of plugin.require) {
              if (!registry.registered(require)) {
                throw errors.REQUIRED_PLUGIN({
                  plugin: plugin.name,
                  require: require,
                });
                }
              }
            }
            return plugin.hooks[name].map(function (hook) {
              return merge(
                {
                  plugin: plugin.name,
                  require: plugin.require,
                },
                hook
              ) as Hook;
            });
          })
          .filter(function (hook) {
            return hook !== undefined;
          })
          .flat() as Hook[]),
        ...(parent
          ? parent.get({
              name: name,
              sort: false,
            })
          : []),
      ];
      if (!sort) {
        return mergedHooks;
      }
      // Topological sort
      const index: Record<string, Hook> = {};
      for (const hook of mergedHooks) {
        if (hook && 'plugin' in hook && hook.plugin) index[hook.plugin] = hook;
      }
      const edges_after = mergedHooks
        .map(function (hook) {
          if (!('after' in hook && Array.isArray(hook.after))) return;
          return hook.after
            .map(function (after) {
              // This check assume the plugin has the same hooks which is not always the case
              if (!index[after] && 'plugin' in hook && hook.plugin) {
                if (registry.registered(after)) {
                  throw errors.PLUGINS_HOOK_AFTER_INVALID({
                    name: name,
                    plugin: hook.plugin,
                    after: after,
                  });
                } else {
                  return undefined;
                }
              }
              return [index[after], hook];
            })
            .filter(function (hook) {
              return hook !== undefined;
            }) as [Hook, Hook][];
        })
        .filter(function (hook) {
          return hook !== undefined;
        }) as [Hook, Hook][][];
      const edges_before = mergedHooks
        .map(function (hook) {
          if (!('before' in hook && Array.isArray(hook.before))) return;
          return hook.before
            .map(function (before) {
              if (!index[before] && 'plugin' in hook && hook.plugin) {
                if (registry.registered(before)) {
                  throw errors.PLUGINS_HOOK_BEFORE_INVALID({
                    name: name,
                    plugin: hook.plugin,
                    before: before,
                  });
                } else {
                  return undefined;
                }
              }
              return [hook, index[before]];
            })
            .filter(function (hook) {
              return hook !== undefined;
            }) as [Hook, Hook][];
        })
        .filter(function (hook) {
          return hook !== undefined;
        }) as [Hook, Hook][][];
      const edges = [...edges_after, ...edges_before].flat(1);
      return toposort.array(mergedHooks, edges).map((hook) => {
        if (hook) {
          if ('require' in hook) delete hook.require;
          if ('plugin' in hook) delete hook.plugin;
        }
        return hook;
      });
    },
    // Call a hook against each registered plugin matching the hook name
    call: async function ({ args = [], handler, hooks = [], name }) {
      if (arguments.length !== 1) {
        throw error('PLUGINS_INVALID_ARGUMENTS_NUMBER', [
          'function `call` expect 1 object argument,',
          `got ${arguments.length} arguments.`,
        ]);
        // eslint-disable-next-line prefer-rest-params
      } else if (!is_object_literal(arguments[0])) {
        throw error('PLUGINS_INVALID_ARGUMENT_PROPERTIES', [
          'function `call` expect argument to be a literal object',
          'with the properties `name`, `args`, `hooks` and `handler`,',
          // eslint-disable-next-line prefer-rest-params
          `got ${JSON.stringify(arguments[0])} arguments.`,
        ]);
      } else if (typeof name !== 'string') {
        throw error('PLUGINS_INVALID_ARGUMENT_NAME', [
          'function `call` requires a property `name` in its first argument,',
          // eslint-disable-next-line prefer-rest-params
          `got ${JSON.stringify(arguments[0])} argument.`,
        ]);
      }
      // Retrieve the name hooks
      hooks = this.get({
        hooks: hooks,
        name: name,
      });
      // Call the hooks
      let maybeHandler;
      for (const hook of hooks) {
        switch (hook.handler.length) {
          case 0:
          case 1:
            await hook.handler.call(this, args);
            break;
          case 2:
            maybeHandler = await hook.handler.call(this, args, handler);
            if (maybeHandler === null) {
              return null;
            }
            break;
          default:
            throw error('PLUGINS_INVALID_HOOK_HANDLER', [
              'hook handlers must have 0 to 2 arguments',
              `got ${hook.handler.length}`,
            ]);
        }
      }
      if (maybeHandler) {
        // Call the final handler
        return maybeHandler.call(this, args);
      }
    },
    // Call a hook against each registered plugin matching the hook name
    call_sync: function ({ args = [], handler, hooks = [], name }) {
      if (arguments.length !== 1) {
        throw error('PLUGINS_INVALID_ARGUMENTS_NUMBER', [
          'function `call` expect 1 object argument,',
          `got ${arguments.length} arguments.`,
        ]);
        // eslint-disable-next-line prefer-rest-params
      } else if (!is_object_literal(arguments[0])) {
        throw error('PLUGINS_INVALID_ARGUMENT_PROPERTIES', [
          'function `call` expect argument to be a literal object',
          'with the properties `name`, `args`, `hooks` and `handler`,',
          // eslint-disable-next-line prefer-rest-params
          `got ${JSON.stringify(arguments[0])} arguments.`,
        ]);
      } else if (typeof name !== 'string') {
        throw error('PLUGINS_INVALID_ARGUMENT_NAME', [
          'function `call` requires a property `name` in its first argument,',
          // eslint-disable-next-line prefer-rest-params
          `got ${JSON.stringify(arguments[0])} argument.`,
        ]);
      }
      // Retrieve the name hooks
      hooks = this.get({
        hooks: hooks,
        name: name,
      });
      // Call the hooks
      let maybeHandler;
      for (const hook of hooks) {
        switch (hook.handler.length) {
          case 0:
          case 1:
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            hook.handler.call(this, args);
            break;
          case 2:
            maybeHandler = hook.handler.call(this, args, handler);
            if (maybeHandler === null) {
              return null;
            }
            break;
          default:
            throw error('PLUGINS_INVALID_HOOK_HANDLER', [
              'hook handlers must have 0 to 2 arguments',
              `got ${hook.handler.length}`,
            ]);
        }
      }
      if (maybeHandler) {
        // Call the final handler
        return Promise.resolve(maybeHandler).then((handler) =>
          handler.call(this, args)
        );
      }
    },
  };
  // Register initial plugins
  for (const plugin of plugins) {
    registry.register(plugin);
  }
  // return the object
  return registry;
};

export { plugandplay };
