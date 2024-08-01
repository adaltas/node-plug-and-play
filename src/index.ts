import { is_object_literal, is_object, merge } from "mixme";
import toposort from "toposort";
import error from "./error.js";

export type Handler<Args> = (
  handlerArgs: Args,
  handler?: Handler<Args>,
) => unknown | void | PromiseLike<unknown>;

// type handlerArgs1<Args> = Parameters<(args: Args) => void>;
// type handlerArgs2<Args> = Parameters<(args: Args, handler: Handler<Args>) => void>;
// type handlerArgs<Args> = handlerArgs1<Args> | handlerArgs2<Args>;
// export type Handler<Args> = (...args: handlerArgs<Args>) => unknown | void | PromiseLike<unknown>;

export interface Hook<Args> {
  after?: string | string[];
  before?: string | string[];
  name?: string;
  handler: Handler<Args>;
}

export interface NormalizedHook<Args> extends Hook<Args> {
  after: string[];
  before: string[];
  name?: string;
  plugin?: string;
  require?: string[];
  handler: Handler<Args>;
}

export interface Plugin<Args> {
  hooks?: Record<string, Handler<Args> | Hook<Args>>;
  name?: string;
  require?: string | string[];
}

export interface PluginNormalized<HookArgs> {
  hooks: Record<string, NormalizedHook<HookArgs>[]>;
  name: string | undefined;
  require: string[];
}

export interface Registry<Args> {
  register: (
    plugin: Plugin<Args> | (<FnArgs, Args>(...Args: FnArgs[]) => Plugin<Args>),
  ) => Registry<Args>;
  registered: (name: string) => boolean;
  get: (args: {
    name: string;
    hooks?: Handler<Args> | Hook<Args> | Hook<Args>[];
    sort?: boolean;
  }) => NormalizedHook<Args>[];
  call: (args: {
    args?: Args;
    handler?: Handler<Args>;
    hooks?: Hook<Args>[];
    name: string;
  }) => Promise<unknown>;
  call_sync: (args: {
    args?: Args;
    handler?: Handler<Args>;
    hooks?: Hook<Args>[];
    name: string;
  }) => unknown;
}

const normalize_hook = function <Args>(
  name: string,
  hook: Handler<Args> | Hook<Args> | Hook<Args>[],
): NormalizedHook<Args>[] {
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
    const normalizedHook = {
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
    } as NormalizedHook<Args>;
    return normalizedHook;
  });
};

const plugandplay = function <Args>({
  args = [],
  chain,
  parent,
  plugins = [],
}: {
  args?: unknown[];
  chain?: unknown;
  parent?: Registry<Args>;
  plugins?: (
    | Plugin<Args>
    | (<FnArgs, Args>(...Args: FnArgs[]) => Plugin<Args>)
  )[];
} = {}): Registry<Args> {
  // Internal plugin store
  const store: PluginNormalized<Args>[] = [];
  // Public API definition
  const registry: Registry<Args> = {
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
      const hooksNormalized: Record<string, NormalizedHook<Args>[]> = {}
      for( const [name, hook] of Object.entries(plugin.hooks || []) ){
        hooksNormalized[name] = normalize_hook(name, hook)
      }
      // Require normalization
      if (plugin.require && !Array.isArray(plugin.require)) {
        plugin.require = [plugin.require];
      }
      const require = !plugin.require ? [] : !Array.isArray(plugin.require) ? [plugin.require] : plugin.require
      const requireNormalized: string[] = (require).map((require) => {
        if (typeof require !== "string")
          throw errors.PLUGINS_REGISTER_INVALID_REQUIRE({
            name: plugin.name,
            require: require,
          });
        return require
      })
      // Plugin normalization
      const normalizedPlugin: PluginNormalized<Args> = {
        hooks: hooksNormalized,
        require: requireNormalized,
        name: plugin.name,
      };
      store.push(normalizedPlugin);
      return chain || this;
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
        ...normalize_hook<Args>(name, hooks),
        // With hooks present in the store
        ...store
          .map(function (plugin) {
            // Only select plugins with the requested hook
            if (!plugin.hooks[name]) return []
            // Validate plugin requirements
            for (const require of plugin.require) {
              if (!registry.registered(require)) {
                throw errors.REQUIRED_PLUGIN({
                  plugin: plugin.name,
                  require: require,
                });
              }
            }
            return plugin.hooks[name]?.map(function (hook) {
              return merge(
                {
                  plugin: plugin.name,
                  require: plugin.require,
                },
                hook,
              ) as NormalizedHook<Args>;
            });
          })
          .filter(Boolean)
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
      const index: Record<string, NormalizedHook<Args>> = {};
      for (const hook of normalizedHooks) {
        if (hook.plugin) index[hook.plugin] = hook;
      }
      type Test = [NormalizedHook<Args>, NormalizedHook<Args>][];
      const edges_after = normalizedHooks
        .map(function (hook) {
          return hook.after.reduce<Test>(function (result, after) {
            if (index[after]) {
              result.push([index[after], hook]);
            } else if (registry.registered(after)) {
              throw errors.PLUGINS_HOOK_AFTER_INVALID({
                name: name,
                plugin: hook.plugin,
                after: after,
              });
            }
            return result;
          }, []);
        });
      const edges_before = normalizedHooks
        .map(function (hook) {
          return hook.before.reduce<Test>(function (result, before) {
            if (index[before]) {
              result.push([hook, index[before]]);
            } else if (registry.registered(before)) {
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
    call: async function ({ args = [], handler, hooks = [], name }) {
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
      const hooksNormalized: NormalizedHook<Args>[] = this.get({
        hooks: hooks,
        name: name,
      });
      // Call the hooks
      for (const hook of hooksNormalized) {
        switch (hook.handler.length) {
          case 0:
          case 1:
            await hook.handler.call(this, args);
            break;
          case 2:
            handler = await hook.handler.call(this, args, handler);
            if (handler === null) {
              return null;
            }
            break;
          default:
            throw error("PLUGINS_INVALID_HOOK_HANDLER", [
              "hook handlers must have 0 to 2 arguments",
              `got ${hook.handler.length}`,
            ]);
        }
      }
      if (handler) {
        // Call the final handler
        return handler.call(this, args);
      }
    },
    // Call a hook against each registered plugin matching the hook name
    call_sync: function ({ args = [], handler, hooks = [], name }) {
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
      const hooksNormalized: NormalizedHook<Args>[] = this.get({
        hooks: hooks,
        name: name,
      });
      // Call the hooks
      for (const hook of hooksNormalized) {
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
            throw error("PLUGINS_INVALID_HOOK_HANDLER", [
              "hook handlers must have 0 to 2 arguments",
              `got ${hook.handler.length}`,
            ]);
        }
      }
      if (handler) {
        // Call the final handler
        return handler.call(this, args);
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

const errors = {
  PLUGINS_HOOK_AFTER_INVALID: function ({
    name,
    plugin,
    after,
  }: {
    name: string;
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
    name: string;
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
    plugin: string | undefined;
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
    name: string | undefined;
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
