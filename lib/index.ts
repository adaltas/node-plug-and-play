import { is_object_literal, is_object, merge } from 'mixme';
import toposort from 'toposort';
import error from './error';

type HookHandler<T extends object> = (
  args: T,
  handler?: HookHandler<T>
) => null | void | HookHandler<T> | Promise<HookHandler<T>>;

export interface Hook<T extends object> {
  /**
   * List of plugin names with hooks of the same name are to be executed after, a string is coerced to an array.
   */
  after?: string[];
  /**
   * List of plugin names with hooks of the same name are to be executed before, a string is coerced to an array.
   */
  before?: string[];
  /**
   * The hook handler to be executed.
   */
  handler: HookHandler<T>;
  /**
   * Name to indentify the hook.
   */
  name?: string;

  plugin?: string;
  require?: string[];
}

export interface Plugin<T extends object = object> {
  /**
   * List of hooks identified by hook names.
   */
  hooks: {
    [name: string]: Hook<T>[] | Hook<T> | HookHandler<T>;
  };
  /**
   * Name of the plugin.
   */
  name: string;
  /**
   * Names of the required plugins.
   */
  require?: string[];
}

interface callArgs<T extends object> {
  /**
   * Argument passed to the handler function as well as all hook handlers.
   */
  args: T;
  /**
   * Function to decorate, receive the value associated with the `args` property.
   */
  handler: HookHandler<T>;
  /**
   * List of completary hooks from the end user.
   */
  hooks?: Hook<T>[];
  /**
   * Name of the hook to execute.
   */
  name: string;
}

interface getArgs<T extends object> {
  /**
   * List of complementary hooks from the end user.
   */
  hooks?: Hook<T>[];
  /**
   * Name of the hook to retrieve.
   */
  name: string;
  /**
   * Sort the hooks relatively to each other using the after and before properties.
   */
  sort?: boolean;
}

interface Registry<T extends object = object> {
  /**
   * Execute a hander function and its associated hooks.
   */
  call: (args: callArgs<T>) => Promise<unknown>;
  /**
   * Execute a hander function and its associated hooks, synchronously.
   */
  call_sync: (args: callArgs<T>) => unknown;
  /**
   * Retrieves registered hooks.
   */
  get: (args: getArgs<T>) => Hook<T>[];
  /**
   * Registers a plugin
   * @remarks Plugin can be provided when instantiating Plug-And-Play by passing the plugins property or they can be provided later on by calling the register function.
   */
  register: (userPlugin: Plugin<T> | ((args?: T) => Plugin<T>)) => Registry<T>;
  /**
   * Check if a plugin is registered.
   */
  registered: (name: string) => boolean;
}

type plugangplayArgs<T extends object> = {
  args?: T;
  chain?: Registry<T>;
  parent?: Registry<T>;
  plugins?: Plugin<T>[];
};

const normalize_hook = function <T extends object>(
  name: string,
  userHooks: Hook<T> | Hook<T>[] | HookHandler<T>
): Hook<T>[] {
  const hooks = !Array.isArray(userHooks) ? [userHooks] : userHooks;
  return hooks.map(function (userHook) {
    const hook: Partial<Hook<T>> = {};
    if (typeof userHook === 'function') {
      hook.handler = userHook;
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
    return hook as Hook<T>;
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

type NormalizedPlugin<T extends object = object> = Plugin<T> & {
  hooks: {
    [name: string]: Hook<T>[];
  };
};

/**
 * Initializes a plugandplay instance
 *
 * @remarks args type can be enforced at initialization.
 * @example
 *
 * Loose typing:
 * ```typescript
 * plugandplay({
 *  args: { foo: "bar" },
 * });
 * ```
 *
 * Specific typing:
 * ```typescript
 * plugandplay<{ bar: object; foo: string }>({
 *  args: { bar: {hello:"world"}, foo: 'baz' },
 * });
 * ```
 *
 * Users would then be forced to use the specified type for args.
 *
 * @returns A new plugin registry
 */
const plugandplay = function <T extends object>({
  args,
  chain,
  parent,
  plugins = [],
}: plugangplayArgs<T> = {}): Registry<T> {
  // Internal plugin store
  const store: NormalizedPlugin<T>[] = [];
  // Public API definition
  const registry: Registry<T> = {
    register: function (userPlugin) {
      if (typeof userPlugin === 'function') {
        return this.register(userPlugin(args));
      } else {
        const plugin: Partial<NormalizedPlugin<T>> = {};
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
            `got ${JSON.stringify(userPlugin)} instead.`,
          ]);
        }
        plugin.name = userPlugin.name;
        plugin.hooks = {};
        if ('hooks' in userPlugin && is_object(userPlugin.hooks)) {
          for (const name in userPlugin.hooks) {
            plugin.hooks[name] = normalize_hook(name, userPlugin.hooks[name]);
          }
        }
        plugin.require = [];
        if ('require' in userPlugin && userPlugin.require) {
          if (typeof userPlugin.require === 'string') {
            plugin.require = [userPlugin.require];
          }
          if (!Array.isArray(userPlugin.require)) {
            throw errors.PLUGINS_REGISTER_INVALID_REQUIRE({
              name: userPlugin.name,
              require: userPlugin.require,
            });
          }
        }

        store.push(plugin as NormalizedPlugin<T>);
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
              ) as Hook<T>;
            });
          })
          .filter(function (hook) {
            return hook !== undefined;
          })
          .flat() as Hook<T>[]),
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
      const index: Record<string, Hook<T>> = {};
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
            }) as [Hook<T>, Hook<T>][];
        })
        .filter(function (hook) {
          return hook !== undefined;
        }) as [Hook<T>, Hook<T>][][];
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
            }) as [Hook<T>, Hook<T>][];
        })
        .filter(function (hook) {
          return hook !== undefined;
        }) as [Hook<T>, Hook<T>][][];
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
    call: async function ({ args, handler, hooks, name }) {
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
    call_sync: function ({ args, handler, hooks, name }) {
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
