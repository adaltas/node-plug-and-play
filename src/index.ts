import { is_object_literal, is_object } from "mixme";
import * as toposort from "toposort";
import error from "./error.js";
export { PlugableError } from "./error.js";

/**
 * Represents a handler function for a hook.
 *
 * @typeParam T - The type of the arguments passed to the hook handler.
 *
 * @param args - The arguments passed to the hook handler.
 * @param handler - The next hook handler in the chain.
 *
 * @returns A Promise or a value that represents the result of the hook handler.
 * @remarks (TODO)
 * Both args and handler are optional by nature.
 * Differentiate the hook handlers from the user handlers
 */
export type Handler<T> = (
  args: T,
  handler: Handler<T>,
) => unknown | void | PromiseLike<unknown> | Handler<T>;

// export type Handler<T> = {
//   (): unknown | void | PromiseLike<unknown>;
//   (args: T): unknown | void | PromiseLike<unknown>;
//   (args: T, handler: Handler<T>): unknown | void | PromiseLike<unknown> | Handler<T>;
// }

/**
 * Represents a hook in the Plug-and-Play system.
 *
 * @typeParam T - The type of the arguments expected by the hook handlers.
 * @property after - List of plugin names with hooks of the same name that should be executed after this hook. If a string is provided, it is coerced to an array.
 * @property before - List of plugin names with hooks of the same name that should be executed before this hook. If a string is provided, it is coerced to an array.
 * @property handler - The hook handler to be executed.
 * @property name - Name to identify the hook.
 */
export interface Hook<T> {
  after?: string | string[];
  before?: string | string[];
  handler: Handler<T>;
  name?: PropertyKey;
}

/**
 * Represents a normalized hook with standardized format.
 *
 * @typeParam T - The type of the arguments and return values of the hooks.
 * @typeParam K - The type of the key of the hook in the record.
 * @property after - An array of plugin names that this hook should be executed after.
 * @property before - An array of plugin names that this hook should be executed before.
 * @property handler - The handler function of the hook.
 * @property name - The name of the hook.
 * @property plugin - The name of the plugin that defines this hook.
 * @property require - An array of plugin names that this plugin requires.
 */
export interface HookNormalized<T, K extends keyof T> {
  after: string[];
  before: string[];
  handler: Handler<T[K]>;
  name: K;
  plugin?: string;
  require?: string[];
}

/**
 * Represents a plugin for the Plug-and-Play system.
 *
 * @typeParam T - Type of parameters expected by hook handlers.
 * @property hooks - List of hooks identified by hook names. Each hook can be an array of hooks, a single hook, or a handler function.
 * @property name - Name identifying the plugin by other plugin with the `after`, `before` and `require` properties.
 * @property require - Names of the required plugins. If a required plugin is not registered, an error is thrown when the plugin is registered.
 */
export interface Plugin<T> {
  hooks: {
    [Name in keyof T]?: Hook<T[Name]>[] | Hook<T[Name]> | Handler<T[Name]>;
  };
  name?: PropertyKey;
  require?: string | string[];
}

/**
 * Represents a normalized plugin with standardized hooks.
 *
 * @typeParam T - The type of the arguments and return values of the hooks.
 * @property hooks - Hooks associated with the plugin, normalized to a standardized format.
 * @property name - Name identifying the plugin by other plugin with the `after`, `before` and `require` properties.
 * @property require - Names of the required plugins. If a required plugin is not registered, an error is thrown when the plugin is registered.
 */
export interface PluginNormalized<T> {
  hooks: {
    [Name in keyof T]: HookNormalized<T, Name>[];
  };
  name: PropertyKey | undefined;
  require: string[];
}

/**
 * Represents the public API of the plugin system.
 *
 * @typeParam T - The type of the arguments and return values of the hooks.
 */
export interface Api<T, Chain = undefined> {
  /**
   * Execute a handler function and its associated hooks.
   *
   * @param options - Options for the synchroneous hook execution.
   * @param options.args - Argument passed to the handler function as well as all hook handlers.
   * @param options.handler - Function to decorate, receive the value associated with the `args` property.
   * @param options.hooks - List of complementary hooks from the end user.
   * @param options.name - Name of the hook to execute.
   * @returns - A promise that resolves to the result of the final handler.
   */
  call: <K extends keyof T>(options: {
    args: T[K];
    handler?: Handler<T[K]>;
    hooks?: Hook<T[K]>[];
    name: K;
  }) => Promise<unknown>;
  /**
   * Execute a handler function and its associated hooks synchronously.
   *
   * @param options - Options for the asynchroneous hook execution.
   * @param options.args - Argument passed to the handler function as well as all hook handlers.
   * @param options.handler - Function to decorate, receive the value associated with the `args` property.
   * @param options.hooks - List of complementary hooks from the end user.
   * @param options.name - Name of the hook to execute.
   * @returns - The result of the final handler.
   */
  call_sync: <K extends keyof T>(options: {
    args: T[K];
    handler?: Handler<T[K]>;
    hooks?: Hook<T[K]>[];
    name: K;
  }) => unknown;
  /**
   * Retrieve the hooks with the given name from all registered plugins, in the order they were registered.
   *
   * @param options - Options used to retrieve the hooks. The default is `[]`.
   * @param options.hooks - List of complementary hooks from the end user. These hooks are merged with the hooks retrieved from the registered plugins.
   * @param options.name - Names of the hook to retrieve.
   * @param options.sort - Topological sorting of the hooks relatively to each other using the `after` and `before` properties. If `sort` is `false`, the hooks are returned in the order they were registered. The default is `true`.
   * @returns - The retrieved hooks.
   */
  get: <K extends keyof T>(options: {
    hooks?: Handler<T[K]> | Hook<T[K]> | Hook<T[K]>[];
    name: K;
    sort?: boolean;
  }) => HookNormalized<T, K>[];
  /**
   * Register a new plugin in the system.
   *
   * @param plugin - The plugin to register.
   * @returns - The plugin system.
   *
   * @remarks Plugin can be provided when instantiating Plug-And-Play by passing the plugins property or they can be provided later on by calling the register function.
   *
   */
  register: (
    plugin: Plugin<T> | ((...Args: unknown[]) => Plugin<T>),
  ) => Chain extends undefined ? this : Chain;
  /**
   * Check if a plugin with the given name is registered with the plugin system.
   *
   * @param name - The name of the plugin to check.
   * @returns - True if the plugin is registered, false otherwise.
   */
  registered: (name: PropertyKey) => boolean;
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
 * @param options - The options used to initiate the library.
 * @param options.args - The arguments to pass to the registered plugins.
 * @param options.chain - The chain of plugins to call the hooks on.
 * @param options.parent - The parent plugin system to call the hooks on.
 * @param options.plugins - The initial plugins to register.
 * @returns - An object representing the plugin system.
 */
const plugandplay = function <
  T extends Record<string, unknown> = Record<string, unknown>,
  Chain = undefined,
>({
  args = [],
  chain,
  parent,
  plugins = [],
}: {
  args?: unknown[];
  chain?: Chain;
  parent?: Api<T, Chain>;
  plugins?: (Plugin<T> | (<FnArgs, T>(...Args: FnArgs[]) => Plugin<T>))[];
} = {}): Api<T, Chain> {
  // Internal plugin store
  const store: PluginNormalized<T>[] = [];
  // Public API definition
  const api: Api<T, Chain> = {
    // Register new plugins
    register: function (plugin) {
      if (typeof plugin !== "function" && !is_object_literal(plugin)) {
        throw error("PLUGINS_REGISTER_INVALID_ARGUMENT", [
          "a plugin must be an object literal or a function returning an object literal",
          "with keys such as `name`, `required` and `hooks`,",
          `got ${JSON.stringify(plugin)} instead.`,
        ]);
      }
      // Obtain plugin from user function
      plugin = typeof plugin === "function" ? plugin(...args) : plugin;
      // Hook normalization
      const hooksNormalized = {} as PluginNormalized<T>["hooks"];
      for (const name in plugin.hooks) {
        if (!plugin.hooks[name]) continue;
        hooksNormalized[name] = normalize_hook(name, plugin.hooks[name]);
      }
      // Require normalization
      if (plugin.require && !Array.isArray(plugin.require)) {
        plugin.require = [plugin.require];
      }
      const require =
        !plugin.require ? []
        : !Array.isArray(plugin.require) ? [plugin.require]
        : plugin.require;
      const requireNormalized: string[] = require.map((require) => {
        if (typeof require !== "string")
          throw errors.PLUGINS_REGISTER_INVALID_REQUIRE({
            name: plugin.name,
            require: require,
          });
        return require;
      });
      // Plugin normalization
      const normalizedPlugin: PluginNormalized<T> = {
        hooks: hooksNormalized,
        require: requireNormalized,
        name: plugin.name,
      };
      store.push(normalizedPlugin);
      return (chain ?? this) as any;
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
      const normalizedHooks = [
        // Merge hooks provided by the user
        ...normalize_hook(name, hooks),
        // With hooks present in the store
        ...store
          .map(function (plugin) {
            // Only select plugins with the requested hook
            if (!plugin.hooks[name]) return;
            // Validate plugin requirements
            for (const require of plugin.require) {
              if (!api.registered(require)) {
                throw errors.REQUIRED_PLUGIN({
                  plugin: plugin.name,
                  require: require,
                });
              }
            }
            return plugin.hooks[name]?.map(
              (hook) =>
                ({
                  plugin: plugin.name,
                  require: plugin.require,
                  ...hook,
                }) as HookNormalized<T, typeof name>,
            );
          })
          .filter(function (hook) {
            return hook !== undefined;
          })
          .flat(1),
        ...(parent ? parent.get({ name: name, sort: false }) : []),
      ];
      if (!sort) {
        return normalizedHooks;
      }
      // Topological sort
      // Hook index associates plugin names to the requested hook
      // About PLUGINS_HOOK_[AFTER|BEFORE]_INVALID error:
      // It is ok for a hook to refer to a non-registered and optional plugin
      // However, if the plugin exists, then it must expose a hook of the same name.
      const index: Record<string, HookNormalized<T, typeof name>> = {};
      for (const hook of normalizedHooks) {
        if (hook.plugin) index[hook.plugin] = hook;
      }
      type Test = [
        HookNormalized<T, typeof name>,
        HookNormalized<T, typeof name>,
      ][];
      const edges_after = normalizedHooks.map(function (hook) {
        return hook.after.reduce<Test>(function (result, after) {
          if (index[after]) {
            result.push([index[after], hook]);
          } else if (api.registered(after)) {
            throw errors.PLUGINS_HOOK_AFTER_INVALID({
              name: name,
              plugin: hook.plugin,
              after: after,
            });
          }
          return result;
        }, []);
      });
      const edges_before = normalizedHooks.map(function (hook) {
        return hook.before.reduce<Test>(function (result, before) {
          if (index[before]) {
            result.push([hook, index[before]]);
          } else if (api.registered(before)) {
            throw errors.PLUGINS_HOOK_BEFORE_INVALID({
              name: name,
              plugin: hook.plugin,
              before: before,
            });
          }
          return result;
        }, []);
      });
      const edges = [...edges_after, ...edges_before].flat(1);
      return toposort.array(normalizedHooks, edges);
    },
    // Call a hook against each registered plugin matching the hook name
    call: async function ({ args, handler, hooks = [], name }) {
      if (arguments.length !== 1) {
        throw error("PLUGINS_INVALID_ARGUMENTS_NUMBER", [
          "function `call` expect 1 object argument,",
          `got ${arguments.length} arguments.`,
        ]);
      } else if (!is_object_literal(arguments[0])) {
        throw error("PLUGINS_INVALID_ARGUMENT_PROPERTIES", [
          "function `call` expect argument to be a literal object",
          "with the properties `name`, `args`, `hooks` and `handler`,",
          `got ${JSON.stringify(arguments[0])} arguments.`,
        ]);
      } else if (typeof name !== "string") {
        throw error("PLUGINS_INVALID_ARGUMENT_NAME", [
          "function `call` requires a property `name` in its first argument,",
          `got ${JSON.stringify(arguments[0])} argument.`,
        ]);
      }
      // Retrieve the name hooks
      const hooksNormalized = this.get({
        hooks: hooks,
        name: name,
      });
      // Call the hooks
      handler = handler || (() => {});
      for (const hook of hooksNormalized) {
        switch (hook.handler.length) {
          case 0:
          case 1:
            await hook.handler(args, () => {});
            break;
          case 2:
            const result = await hook.handler(args, handler);
            if (result === null) {
              return null;
              // Note, this respect the implementation prior the TS migration
              // See test in call.ts # continue with `undefined` # when `undefined` is returned, sync mode
              // Not necessarily a good idea, shall be more strict on what the
              // hook handler might return
            } else {
              // }else if(result !== undefined) {
              // }else if (typeof result === 'function') {
              handler = result as Handler<T[typeof hook.name]>;
            }
            break;
          default:
            throw error("PLUGINS_INVALID_HOOK_HANDLER", [
              "hook handlers must have 0 to 2 arguments",
              `got ${hook.handler.length}`,
            ]);
        }
      }
      // Call the final handler
      return handler ? handler(args, () => {}) : undefined;
    },
    // Call a hook against each registered plugin matching the hook name
    call_sync: function ({ args, handler, hooks = [], name }) {
      if (arguments.length !== 1) {
        throw error("PLUGINS_INVALID_ARGUMENTS_NUMBER", [
          "function `call` expect 1 object argument,",
          `got ${arguments.length} arguments.`,
        ]);
      } else if (!is_object_literal(arguments[0])) {
        throw error("PLUGINS_INVALID_ARGUMENT_PROPERTIES", [
          "function `call` expect argument to be a literal object",
          "with the properties `name`, `args`, `hooks` and `handler`,",
          `got ${JSON.stringify(arguments[0])} arguments.`,
        ]);
      } else if (typeof name !== "string") {
        throw error("PLUGINS_INVALID_ARGUMENT_NAME", [
          "function `call` requires a property `name` in its first argument,",
          `got ${JSON.stringify(arguments[0])} argument.`,
        ]);
      }
      // Retrieve the name hooks
      const hooksNormalized = this.get({
        hooks: hooks,
        name: name,
      });
      // Call the hooks
      handler = handler || (() => {});
      for (const hook of hooksNormalized) {
        switch (hook.handler.length) {
          case 0:
          case 1:
            hook.handler(args, () => {});
            break;
          case 2:
            const result = hook.handler(args, handler);
            if (result === null) {
              return null;
              // Note, this respect the implementation prior the TS migration
              // See test in call.ts # continue with `undefined` # when `undefined` is returned, sync mode
              // Not necessarily a good idea, shall be more strict on what the
              // hook handler might return
            } else {
              // }else if(result !== undefined) {
              // }else if (typeof result === 'function') {
              handler = result as Handler<T[typeof hook.name]>;
            }
            break;
          default:
            throw error("PLUGINS_INVALID_HOOK_HANDLER", [
              "hook handlers must have 0 to 2 arguments",
              `got ${hook.handler.length}`,
            ]);
        }
      }
      // Call the final handler
      return handler ? handler(args, () => {}) : undefined;
    },
  };
  // Register initial plugins
  for (const plugin of plugins) {
    api.register(plugin);
  }
  // return the object
  return api;
};

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
  hook: Handler<T[K]> | Hook<T[K]> | Hook<T[K]>[],
): HookNormalized<T, K>[] {
  const hooks = Array.isArray(hook) ? hook : [hook];
  return hooks.map(function (hook) {
    if (typeof hook !== "function" && !is_object(hook)) {
      throw error("PLUGINS_HOOK_INVALID_HANDLER", [
        "no hook handler function could be found,",
        "a hook must be defined as a function",
        "or as an object with an handler property,",
        `got ${JSON.stringify(hook)} instead.`,
      ]);
    }
    return {
      after:
        !(typeof hook !== "function" && hook.after) ? []
        : typeof hook.after === "string" ? [hook.after]
        : hook.after,
      name: name,
      before:
        !(typeof hook !== "function" && hook.before) ? []
        : typeof hook.before === "string" ? [hook.before]
        : hook.before,
      handler: typeof hook === "function" ? hook : hook.handler,
    };
  });
};

const errors = {
  PLUGINS_HOOK_AFTER_INVALID: function ({
    name,
    plugin,
    after,
  }: {
    name: PropertyKey;
    plugin: string | undefined;
    after: string;
  }) {
    throw error("PLUGINS_HOOK_AFTER_INVALID", [
      `the hook ${JSON.stringify(name)}`,
      plugin ? `in plugin ${JSON.stringify(plugin)}` : "",
      "references an after dependency",
      `in plugin ${JSON.stringify(after)} which does not exists.`,
    ]);
  },
  PLUGINS_HOOK_BEFORE_INVALID: function ({
    name,
    plugin,
    before,
  }: {
    name: PropertyKey;
    plugin: string | undefined;
    before: string;
  }) {
    throw error("PLUGINS_HOOK_BEFORE_INVALID", [
      `the hook ${JSON.stringify(name)}`,
      plugin ? `in plugin ${JSON.stringify(plugin)}` : "",
      "references a before dependency",
      `in plugin ${JSON.stringify(before)} which does not exists.`,
    ]);
  },
  REQUIRED_PLUGIN: function ({
    plugin,
    require,
  }: {
    plugin: PropertyKey | undefined;
    require: string;
  }) {
    throw error("REQUIRED_PLUGIN", [
      `the plugin ${JSON.stringify(plugin)}`,
      "requires a plugin",
      `named ${JSON.stringify(require)} which is not unregistered.`,
    ]);
  },
  PLUGINS_REGISTER_INVALID_REQUIRE: function ({
    name,
    require,
  }: {
    name: PropertyKey | undefined;
    require: string;
  }) {
    throw error("PLUGINS_REGISTER_INVALID_REQUIRE", [
      "the `require` property",
      name ? `in plugin ${JSON.stringify(name)}` : "",
      "must be a string or an array,",
      `got ${JSON.stringify(require)}.`,
    ]);
  },
};

export { plugandplay };
