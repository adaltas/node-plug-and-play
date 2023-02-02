import { is_object_literal, is_object } from "mixme";
import toposort from "toposort";
import error from "./error.js";
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
const plugandplay = function ({ args = [], chain, parent, plugins = [], } = {}) {
    // Internal plugin store
    const store = [];
    // Public API definition
    const api = {
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
            const hooksNormalized = {};
            for (const name in plugin.hooks) {
                if (!plugin.hooks[name])
                    continue;
                hooksNormalized[name] = normalize_hook(name, plugin.hooks[name]);
            }
            // Require normalization
            if (plugin.require && !Array.isArray(plugin.require)) {
                plugin.require = [plugin.require];
            }
            const require = !plugin.require ? []
                : !Array.isArray(plugin.require) ? [plugin.require]
                    : plugin.require;
            const requireNormalized = require.map((require) => {
                if (typeof require !== "string")
                    throw errors.PLUGINS_REGISTER_INVALID_REQUIRE({
                        name: plugin.name,
                        require: require,
                    });
                return require;
            });
            // Plugin normalization
            const normalizedPlugin = {
                hooks: hooksNormalized,
                require: requireNormalized,
                name: plugin.name,
            };
            store.push(normalizedPlugin);
            return (chain ?? this);
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
                    if (!plugin.hooks[name])
                        return;
                    // Validate plugin requirements
                    for (const require of plugin.require) {
                        if (!api.registered(require)) {
                            throw errors.REQUIRED_PLUGIN({
                                plugin: plugin.name,
                                require: require,
                            });
                        }
                    }
                    return plugin.hooks[name]?.map((hook) => ({
                        plugin: plugin.name,
                        require: plugin.require,
                        ...hook,
                    }));
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
            const index = {};
            for (const hook of normalizedHooks) {
                if (hook.plugin)
                    index[hook.plugin] = hook;
            }
            const edges_after = normalizedHooks.map(function (hook) {
                return hook.after.reduce(function (result, after) {
                    if (index[after]) {
                        result.push([index[after], hook]);
                    }
                    else if (api.registered(after)) {
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
                return hook.before.reduce(function (result, before) {
                    if (index[before]) {
                        result.push([hook, index[before]]);
                    }
                    else if (api.registered(before)) {
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
            }
            else if (!is_object_literal(arguments[0])) {
                throw error("PLUGINS_INVALID_ARGUMENT_PROPERTIES", [
                    "function `call` expect argument to be a literal object",
                    "with the properties `name`, `args`, `hooks` and `handler`,",
                    `got ${JSON.stringify(arguments[0])} arguments.`,
                ]);
            }
            else if (typeof name !== "string") {
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
            handler = handler || (() => { });
            for (const hook of hooksNormalized) {
                switch (hook.handler.length) {
                    case 0:
                    case 1:
                        await hook.handler(args, () => { });
                        break;
                    case 2:
                        const result = await hook.handler(args, handler);
                        if (result === null) {
                            return null;
                            // Note, this respect the implementation prior the TS migration
                            // See test in call.ts # continue with `undefined` # when `undefined` is returned, sync mode
                            // Not necessarily a good idea, shall be more strict on what the
                            // hook handler might return
                        }
                        else {
                            // }else if(result !== undefined) {
                            // }else if (typeof result === 'function') {
                            handler = result;
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
            return handler ? handler(args, () => { }) : undefined;
        },
        // Call a hook against each registered plugin matching the hook name
        call_sync: function ({ args, handler, hooks = [], name }) {
            if (arguments.length !== 1) {
                throw error("PLUGINS_INVALID_ARGUMENTS_NUMBER", [
                    "function `call` expect 1 object argument,",
                    `got ${arguments.length} arguments.`,
                ]);
            }
            else if (!is_object_literal(arguments[0])) {
                throw error("PLUGINS_INVALID_ARGUMENT_PROPERTIES", [
                    "function `call` expect argument to be a literal object",
                    "with the properties `name`, `args`, `hooks` and `handler`,",
                    `got ${JSON.stringify(arguments[0])} arguments.`,
                ]);
            }
            else if (typeof name !== "string") {
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
            handler = handler || (() => { });
            for (const hook of hooksNormalized) {
                switch (hook.handler.length) {
                    case 0:
                    case 1:
                        hook.handler(args, () => { });
                        break;
                    case 2:
                        const result = hook.handler(args, handler);
                        if (result === null) {
                            return null;
                            // Note, this respect the implementation prior the TS migration
                            // See test in call.ts # continue with `undefined` # when `undefined` is returned, sync mode
                            // Not necessarily a good idea, shall be more strict on what the
                            // hook handler might return
                        }
                        else {
                            // }else if(result !== undefined) {
                            // }else if (typeof result === 'function') {
                            handler = result;
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
            return handler ? handler(args, () => { }) : undefined;
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
const normalize_hook = function (name, hook) {
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
            after: !(typeof hook !== "function" && hook.after) ? []
                : typeof hook.after === "string" ? [hook.after]
                    : hook.after,
            name: name,
            before: !(typeof hook !== "function" && hook.before) ? []
                : typeof hook.before === "string" ? [hook.before]
                    : hook.before,
            handler: typeof hook === "function" ? hook : hook.handler,
        };
    });
};
const errors = {
    PLUGINS_HOOK_AFTER_INVALID: function ({ name, plugin, after, }) {
        throw error("PLUGINS_HOOK_AFTER_INVALID", [
            `the hook ${JSON.stringify(name)}`,
            plugin ? `in plugin ${JSON.stringify(plugin)}` : "",
            "references an after dependency",
            `in plugin ${JSON.stringify(after)} which does not exists.`,
        ]);
    },
    PLUGINS_HOOK_BEFORE_INVALID: function ({ name, plugin, before, }) {
        throw error("PLUGINS_HOOK_BEFORE_INVALID", [
            `the hook ${JSON.stringify(name)}`,
            plugin ? `in plugin ${JSON.stringify(plugin)}` : "",
            "references a before dependency",
            `in plugin ${JSON.stringify(before)} which does not exists.`,
        ]);
    },
    REQUIRED_PLUGIN: function ({ plugin, require, }) {
        throw error("REQUIRED_PLUGIN", [
            `the plugin ${JSON.stringify(plugin)}`,
            "requires a plugin",
            `named ${JSON.stringify(require)} which is not unregistered.`,
        ]);
    },
    PLUGINS_REGISTER_INVALID_REQUIRE: function ({ name, require, }) {
        throw error("PLUGINS_REGISTER_INVALID_REQUIRE", [
            "the `require` property",
            name ? `in plugin ${JSON.stringify(name)}` : "",
            "must be a string or an array,",
            `got ${JSON.stringify(require)}.`,
        ]);
    },
};
export { plugandplay };
//# sourceMappingURL=index.js.map