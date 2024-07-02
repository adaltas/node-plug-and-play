import { is_object, is_object_literal, merge } from 'mixme';
import toposort from 'toposort';

import error from './error.js';

/**
 * Represents a handler function for a hook.
 *
 * @typeParam T - The type of the arguments passed to the hook handler.
 *
 * @param args - The arguments passed to the hook handler.
 * @param handler - The next hook handler in the chain.
 *
 * @returns A Promise or a value that represents the result of the hook handler.
 */
export type HookHandler<T> = (
  args: T,
  handler?: HookHandler<T>
) => null | void | HookHandler<T> | Promise<HookHandler<T>>;

/**
 * Represents a hook in the Plug-and-Play system.
 *
 * @typeParam T - The type of the arguments expected by the hook handlers.
 */
export interface Hook<T> {
  /**
   * List of plugin names with hooks of the same name that should be executed after this hook.
   * If a string is provided, it is coerced to an array.
   */
  after?: string | string[];

  /**
   * List of plugin names with hooks of the same name that should be executed before this hook.
   * If a string is provided, it is coerced to an array.
   */
  before?: string | string[];

  /**
   * The hook handler to be executed.
   */
  handler: HookHandler<T>;

  /**
   * Name to identify the hook.
   */
  name?: PropertyKey;

  /**
   * Name of the plugin that defines this hook.
   */
  plugin?: string;

  /**
   * List of plugin names that this hook requires.
   */
  require?: string | string[];
}

/**
 * Represents a plugin for the Plug-and-Play system.
 *
 * @typeParam T - Type of parameters expected by hook handlers.
 */
export interface Plugin<T> {
  /**
   * List of hooks identified by hook names.
   *
   * Each hook can be an array of hooks, a single hook, or a handler function.
   */
  hooks: {
    [name in keyof T]: Hook<T[name]>[] | Hook<T[name]> | HookHandler<T[name]>;
  };

  /**
   * Name of the plugin.
   */
  name: PropertyKey;

  /**
   * Names of the required plugins.
   *
   * If a required plugin is not registered, an error will be thrown when the plugin is registered.
   */
  require?: string[];
}

interface callArguments<T, K extends keyof T> {
  /**
   * Argument passed to the handler function as well as all hook handlers.
   */
  args: T[K];

  /**
   * Function to decorate, receive the value associated with the `args` property.
   */
  handler: HookHandler<T[K]>;

  /**
   * List of completary hooks from the end user.
   */
  hooks?: Hook<T[K]>[];

  /**
   * Name of the hook to execute.
   */
  name: K;
}
interface getArguments<T, K extends keyof T> {
  /**
   * List of complementary hooks from the end user.
   */
  hooks?: Hook<T[K]>[];

  /**
   * Name of the hook to retrieve.
   */
  name: K;

  /**
   * Sort the hooks relatively to each other using the after and before properties.
   */
  sort?: boolean;
}

type CallFunction<T> = <K extends keyof T>(
  args: callArguments<T, K>
) => Promise<unknown>;

type CallSyncFunction<T> = <K extends keyof T>(
  args: callArguments<T, K>
) => unknown;

type GetFunction<T> = <K extends keyof T>(
  args: getArguments<T, K>
) => Hook<T[K]>[];

export interface Registry<T> {
  /**
   * Execute a handler function and its associated hooks.
   *
   * @param args - The arguments to pass to the hooks.
   * @param handler - The handler to pass to the hooks.
   * @param hooks - The hooks to call.
   * @param name - The name of the hooks to call.
   * @returns - A promise that resolves to the result of the final handler.
   */
  call: CallFunction<T>;
  /**
   * Execute a handler function and its associated hooks synchronously.
   *
   * @param args - The arguments to pass to the hooks.
   * @param handler - The handler to pass to the hooks.
   * @param hooks - The hooks to call.
   * @param name - The name of the hooks to call.
   * @returns - The result of the final handler.
   */
  call_sync: CallSyncFunction<T>;
  /**
   * Retrieve the hooks with the given name from all registered plugins, in the order they were registered.
   *
   * @param hooks - The hooks to retrieve.
   * @param name - The name of the hooks to retrieve.
   * @param sort - Whether to sort the hooks topologically.
   * @returns - The retrieved hooks.
   */
  get: GetFunction<T>;
  /**
   * Registers a plugin
   * @remarks Plugin can be provided when instantiating Plug-And-Play by passing the plugins property or they can be provided later on by calling the register function.
   */

  /**
   * Register a plugin with the plugin system.
   *
   * @param userPlugin - The plugin to register.
   * @returns - The plugin system.
   *
   * @remarks Plugin can be provided when instantiating Plug-And-Play by passing the plugins property or they can be provided later on by calling the register function.
   *
   */
  register: (
    userPlugin: Plugin<T> | ((...args: unknown[]) => Plugin<T>)
  ) => Registry<T>;
  /**
   * Check if a plugin with the given name is registered with the plugin system.
   *
   * @param name - The name of the plugin to check.
   * @returns - True if the plugin is registered, false otherwise.
   */
  registered: (name: PropertyKey) => boolean;
}

interface plugangplayArguments<T> {
  args?: unknown[];
  chain?: Registry<T>;
  parent?: Registry<T>;
  plugins?: Plugin<T>[];
}

/**
 * Normalize a hook definition to a standardized format.
 *
 * @typeParam T - Type of parameters expected by hook handlers.
 *
 * @param name - Name of the hook.
 * @param hook - User-defined hook definition.
 *
 * @returns An array of standardized hook definitions.
 */
const normalize_hook = function <T, K extends keyof T>(
  name: K,
  hook: Hook<T[K]> | Hook<T[K]>[] | HookHandler<T[K]>
): Hook<T[K]>[] {
  const hookArray = Array.isArray(hook) ? hook : [hook];

  return hookArray.map(function (hook) {
    let normalizedHook = structuredClone(hook);

    if (typeof normalizedHook === 'function') {
      normalizedHook = {
        handler: normalizedHook,
      };
    } else if (!is_object(normalizedHook)) {
      throw error('PLUGINS_HOOK_INVALID_HANDLER', [
        'no hook handler function could be found,',
        'a hook must be defined as a function',
        'or as an object with an handler property,',
        `got ${JSON.stringify(normalizedHook)} instead.`,
      ]);
    }

    normalizedHook.name = name;

    normalizedHook.after =
      'after' in normalizedHook && typeof normalizedHook.after === 'string'
        ? [normalizedHook.after]
        : normalizedHook?.after;
    normalizedHook.before =
      'before' in normalizedHook && typeof normalizedHook.before === 'string'
        ? [normalizedHook.before]
        : normalizedHook?.before;

    return normalizedHook;
  });
};

const errors = {
  PLUGINS_HOOK_AFTER_INVALID: function ({
    name,
    plugin,
    after,
  }: {
    after: string;
    name: PropertyKey;
    plugin: string;
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
    before: string;
    name: PropertyKey;
    plugin: string;
  }) {
    throw error('PLUGINS_HOOK_BEFORE_INVALID', [
      `the hook ${JSON.stringify(name)}`,
      plugin ? `in plugin ${JSON.stringify(plugin)}` : void 0,
      'references a before dependency',
      `in plugin ${JSON.stringify(before)} which does not exists.`,
    ]);
  },
  PLUGINS_REGISTER_INVALID_REQUIRE: function ({
    name,
    require,
  }: {
    name: PropertyKey;
    require: string;
  }) {
    throw error('PLUGINS_REGISTER_INVALID_REQUIRE', [
      'the `require` property',
      name ? `in plugin ${JSON.stringify(name)}` : void 0,
      'must be a string or an array,',
      `got ${JSON.stringify(require)}.`,
    ]);
  },
  REQUIRED_PLUGIN: function ({
    plugin,
    require,
  }: {
    plugin: PropertyKey;
    require: string;
  }) {
    throw error('REQUIRED_PLUGIN', [
      `the plugin ${JSON.stringify(plugin)}`,
      'requires a plugin',
      `named ${JSON.stringify(require)} which is not registered.`,
    ]);
  },
};
/**
 * Represents a normalized plugin with standardized hooks.
 *
 * @typeParam T - The type of the arguments and return values of the hooks.
 */
interface NormalizedPlugin<T> {
  /**
   * The hooks associated with the plugin, normalized to a standardized format.
   */
  hooks: {
    [name in keyof T]: Hook<T[name]>[];
  };

  /**
   * Name of the plugin.
   */
  name: PropertyKey;

  /**
   * Names of the required plugins.
   */
  require?: string[];
}

/**
 * A function to initialize a plugandplay instance. Creates a plugin system with support for hooks and plugin requirements.
 *
 * @typeParam T - The type of the arguments and return values of the hooks. An object representing the type of every hook arguments.
 * @example
 *
 * Loose typing:
 * ```typescript
 * plugandplay();
 * ```
 *
 * Specific typing:
 * ```typescript
 * plugandplay<{
 *   "first-hook" : { bar: number; foo: string };
 *   "second-hook" : { baz: object }
 * }>();
 * ```
 * @param args - The arguments to pass to the registered plugins.
 * @param chain - The chain of plugins to call the hooks on.
 * @param parent - The parent plugin system to call the hooks on.
 * @param plugins - The initial plugins to register.
 * @returns - An object representing the plugin system.
 */
const plugandplay = function <
  T extends Record<string, unknown> = Record<string, unknown>,
>({
  args = [],
  chain,
  parent,
  plugins = [],
}: plugangplayArguments<T> = {}): Registry<T> {
  // Internal plugin store
  const store: NormalizedPlugin<T>[] = [];

  // Public API definition
  const registry: Registry<T> = {
    /**
     * Registers a plugin with the plugin system.
     *
     * @param plugin - The plugin to register.
     * @returns - The plugin system.
     */
    register: function (plugin) {
      const normalizedPlugin: NormalizedPlugin<T> =
        typeof plugin === 'function'
          ? (plugin(...args) as NormalizedPlugin<T>)
          : (structuredClone(plugin) as NormalizedPlugin<T>);

      // Validate the plugin
      if (
        !(
          is_object_literal(normalizedPlugin) &&
          'name' in normalizedPlugin &&
          typeof normalizedPlugin.name === 'string'
        )
      ) {
        throw error('PLUGINS_REGISTER_INVALID_ARGUMENT', [
          'a plugin must be an object literal or a function returning an object literal',
          'with keys such as `name`, `required` and `hooks`,',
          `got ${JSON.stringify(normalizedPlugin)} instead.`,
        ]);
      }

      // Normalize the plugin hooks
      if (normalizedPlugin.hooks == null) {
        normalizedPlugin.hooks = {} as { [name in keyof T]: Hook<T[name]>[] };
      }

      for (const name in normalizedPlugin.hooks) {
        normalizedPlugin.hooks[name] = normalize_hook<T, typeof name>(
          name,
          normalizedPlugin.hooks[name]
        );
      }

      // Normalize the plugin requirements
      normalizedPlugin.require = [];
      if ('require' in plugin && plugin.require) {
        if (typeof plugin.require === 'string') {
          normalizedPlugin.require = [plugin.require];
        }
        if (!Array.isArray(plugin.require)) {
          throw errors.PLUGINS_REGISTER_INVALID_REQUIRE({
            name: plugin.name,
            require: plugin.require,
          });
        }
      }

      // Add the plugin to the store
      store.push(normalizedPlugin);

      // Return the plugin system
      return chain ?? this;
    },

    /**
     * Checks if a plugin with the given name is registered with the plugin system.
     *
     * @param name - The name of the plugin to check.
     * @returns - True if the plugin is registered, false otherwise.
     */
    registered: function (name) {
      for (const plugin of store) {
        if (plugin.name === name) {
          return true;
        }
      }
      return !!parent?.registered(name);
    },

    /**
     * Calls the hooks with the given name on all registered plugins, in the order they were registered.
     *
     * @param args - The arguments to pass to the hooks.
     * @param handler - The handler to pass to the hooks.
     * @param hooks - The hooks to call.
     * @param name - The name of the hooks to call.
     * @returns - A promise that resolves to the result of the final handler.
     */
    call: async function ({ args, handler, hooks, name }) {
      // Validate the arguments
      if (arguments.length !== 1) {
        throw error('PLUGINS_INVALID_ARGUMENTS_NUMBER', [
          'function `call` expect 1 object argument,',
          `got ${arguments.length} arguments.`,
        ]);
      } else if (!is_object_literal(arguments[0])) {
        throw error('PLUGINS_INVALID_ARGUMENT_PROPERTIES', [
          'function `call` expect argument to be a literal object',
          'with the properties `name`, `args`, `hooks` and `handler`,',
          `got ${JSON.stringify(arguments[0])} arguments.`,
        ]);
      } else if (typeof name !== 'string') {
        throw error('PLUGINS_INVALID_ARGUMENT_NAME', [
          'function `call` requires a property `name` in its first argument,',
          `got ${JSON.stringify(arguments[0])} argument.`,
        ]);
      }
      // Retrieve the hooks
      hooks = this.get({
        hooks: hooks,
        name: name,
      });

      // Call the hooks
      let maybeHandler;
      for (const hook of hooks) {
        switch (hook.handler.length) {
          case 0:
          case 1: {
            await hook.handler.call(this, args);
            break;
          }
          case 2: {
            maybeHandler = await hook.handler.call(this, args, handler);
            if (maybeHandler === null) {
              return null;
            }
            break;
          }
          default: {
            throw error('PLUGINS_INVALID_HOOK_HANDLER', [
              'hook handlers must have 0 to 2 arguments',
              `got ${hook.handler.length}`,
            ]);
          }
        }
      }
      if (maybeHandler) {
        // Call the final handler
        return maybeHandler.call(this, args);
      }
    },

    /**
     * Calls the hooks with the given name on all registered plugins, in the order they were registered.
     *
     * @param args - The arguments to pass to the hooks.
     * @param handler - The handler to pass to the hooks.
     * @param hooks - The hooks to call.
     * @param name - The name of the hooks to call.
     * @returns - The result of the final handler.
     */
    call_sync: function ({ args, handler, hooks, name }) {
      // Validate the arguments
      if (arguments.length !== 1) {
        throw error('PLUGINS_INVALID_ARGUMENTS_NUMBER', [
          'function `call` expect 1 object argument,',
          `got ${arguments.length} arguments.`,
        ]);
      } else if (!is_object_literal(arguments[0])) {
        throw error('PLUGINS_INVALID_ARGUMENT_PROPERTIES', [
          'function `call` expect argument to be a literal object',
          'with the properties `name`, `args`, `hooks` and `handler`,',
          `got ${JSON.stringify(arguments[0])} arguments.`,
        ]);
      } else if (typeof name !== 'string') {
        throw error('PLUGINS_INVALID_ARGUMENT_NAME', [
          'function `call` requires a property `name` in its first argument,',
          `got ${JSON.stringify(arguments[0])} argument.`,
        ]);
      }
      // Retrieve the hooks
      hooks = this.get({
        hooks: hooks,
        name: name,
      });

      // Call the hooks
      let maybeHandler;
      for (const hook of hooks) {
        switch (hook.handler.length) {
          case 0:
          case 1: {
            hook.handler.call(this, args);
            break;
          }
          case 2: {
            maybeHandler = hook.handler.call(this, args, handler);
            if (maybeHandler === null) {
              return null;
            }
            break;
          }
          default: {
            throw error('PLUGINS_INVALID_HOOK_HANDLER', [
              'hook handlers must have 0 to 2 arguments',
              `got ${hook.handler.length}`,
            ]);
          }
        }
      }
      if (maybeHandler) {
        return Promise.resolve(maybeHandler).then((handler) =>
          handler.call(this, args)
        );
      }
    },

    /**
     * Retrieves the hooks with the given name from all registered plugins, in the order they were registered.
     *
     * @param hooks - The hooks to retrieve.
     * @param name - The name of the hooks to retrieve.
     * @param sort - Whether to sort the hooks topologically.
     * @returns - The retrieved hooks.
     */
    get: function <K extends keyof T>({
      name,
      hooks = [],
      sort = true,
    }: getArguments<T, K>) {
      const mergedHooks = [
        ...normalize_hook<T, K>(name, hooks),
        ...store
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

            // Normalize the plugin hooks
            return plugin.hooks[name].map(function (hook) {
              return merge(
                {
                  plugin: plugin.name,
                  require: plugin.require,
                },
                hook
              ) as Hook<T[K]>;
            });
          })
          .filter(function (hook) {
            return hook !== undefined;
          })
          .flat(),
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
      const index: Record<string, Hook<T[K]>> = {};
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
                    after: after,
                    name: name,
                    plugin: hook.plugin,
                  });
                } else {
                  return;
                }
              }
              return [index[after], hook];
            })
            .filter(function (hook) {
              return hook !== undefined;
            }) as [Hook<T[K]>, Hook<T[K]>][];
        })
        .filter(function (hook) {
          return hook !== undefined;
        });
      const edges_before = mergedHooks
        .map(function (hook) {
          if (!('before' in hook && Array.isArray(hook.before))) return;
          return hook.before
            .map(function (before) {
              if (!index[before] && 'plugin' in hook && hook.plugin) {
                if (registry.registered(before)) {
                  throw errors.PLUGINS_HOOK_BEFORE_INVALID({
                    before: before,
                    name: name,
                    plugin: hook.plugin,
                  });
                } else {
                  return;
                }
              }
              return [hook, index[before]];
            })
            .filter(function (hook) {
              return hook !== undefined;
            }) as [Hook<T[K]>, Hook<T[K]>][];
        })
        .filter(function (hook) {
          return hook !== undefined;
        });
      const edges = [...edges_after, ...edges_before].flat(1);
      return toposort.array(mergedHooks, edges).map((hook) => {
        if (hook) {
          if ('require' in hook) delete hook.require;
          if ('plugin' in hook) delete hook.plugin;
        }
        return hook;
      });
    },
  };
  // Register initial plugins
  for (const plugin of plugins) {
    registry.register(plugin);
  }
  // return the plugin system
  return registry;
};

export { plugandplay };
