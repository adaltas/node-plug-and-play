import { is_object_literal, is_object, merge } from 'mixme';
import toposort from 'toposort';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

const PlugableError = class PlugableError extends Error {
    constructor(code, message, ...contexts) {
        if (Array.isArray(message)) {
            message = message
                .filter(function (line) {
                return !!line;
            })
                .join(' ');
        }
        message = `${code}: ${message}`;
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, PlugableError);
        }
        this.code = code;
        for (let i = 0; i < contexts.length; i++) {
            const context = contexts[i];
            for (const key in context) {
                if (key === 'code') {
                    continue;
                }
                const value = context[key];
                if (value === void 0) {
                    continue;
                }
                this[key] = Buffer.isBuffer(value)
                    ? value.toString()
                    : value === null
                        ? value
                        : JSON.parse(JSON.stringify(value));
            }
        }
    }
};
var error = (function (...args) {
    return new PlugableError(...args);
});

const normalize_hook = function (name, userHooks) {
    const hooks = !Array.isArray(userHooks) ? [userHooks] : userHooks;
    return hooks.map(function (userHook) {
        const hook = {};
        if (typeof userHook === 'function') {
            hook.handler = userHook;
        }
        else if (!is_object(userHook) && Object.keys(userHook).length === 0) {
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
        return hook;
    });
};
const errors = {
    PLUGINS_HOOK_AFTER_INVALID: function ({ name, plugin, after, }) {
        throw error('PLUGINS_HOOK_AFTER_INVALID', [
            `the hook ${JSON.stringify(name)}`,
            plugin ? `in plugin ${JSON.stringify(plugin)}` : void 0,
            'references an after dependency',
            `in plugin ${JSON.stringify(after)} which does not exists.`,
        ]);
    },
    PLUGINS_HOOK_BEFORE_INVALID: function ({ name, plugin, before, }) {
        throw error('PLUGINS_HOOK_BEFORE_INVALID', [
            `the hook ${JSON.stringify(name)}`,
            plugin ? `in plugin ${JSON.stringify(plugin)}` : void 0,
            'references a before dependency',
            `in plugin ${JSON.stringify(before)} which does not exists.`,
        ]);
    },
    REQUIRED_PLUGIN: function ({ plugin, require, }) {
        throw error('REQUIRED_PLUGIN', [
            `the plugin ${JSON.stringify(plugin)}`,
            'requires a plugin',
            `named ${JSON.stringify(require)} which is not registered.`,
        ]);
    },
    PLUGINS_REGISTER_INVALID_REQUIRE: function ({ name, require, }) {
        throw error('PLUGINS_REGISTER_INVALID_REQUIRE', [
            'the `require` property',
            name ? `in plugin ${JSON.stringify(name)}` : void 0,
            'must be a string or an array,',
            `got ${JSON.stringify(require)}.`,
        ]);
    },
};
const plugandplay = function ({ args, chain, parent, plugins = [], } = {}) {
    const store = [];
    const registry = {
        register: function (userPlugin) {
            if (typeof userPlugin === 'function') {
                return this.register(userPlugin(args));
            }
            else {
                const plugin = {};
                if (!(is_object_literal(plugin) &&
                    'name' in userPlugin &&
                    typeof userPlugin.name === 'string')) {
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
                store.push(plugin);
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
                ...store
                    .map(function (plugin) {
                    if (!plugin.hooks[name])
                        return;
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
                        return merge({
                            plugin: plugin.name,
                            require: plugin.require,
                        }, hook);
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
            const index = {};
            for (const hook of mergedHooks) {
                if (hook && 'plugin' in hook && hook.plugin)
                    index[hook.plugin] = hook;
            }
            const edges_after = mergedHooks
                .map(function (hook) {
                if (!('after' in hook && Array.isArray(hook.after)))
                    return;
                return hook.after
                    .map(function (after) {
                    if (!index[after] && 'plugin' in hook && hook.plugin) {
                        if (registry.registered(after)) {
                            throw errors.PLUGINS_HOOK_AFTER_INVALID({
                                name: name,
                                plugin: hook.plugin,
                                after: after,
                            });
                        }
                        else {
                            return undefined;
                        }
                    }
                    return [index[after], hook];
                })
                    .filter(function (hook) {
                    return hook !== undefined;
                });
            })
                .filter(function (hook) {
                return hook !== undefined;
            });
            const edges_before = mergedHooks
                .map(function (hook) {
                if (!('before' in hook && Array.isArray(hook.before)))
                    return;
                return hook.before
                    .map(function (before) {
                    if (!index[before] && 'plugin' in hook && hook.plugin) {
                        if (registry.registered(before)) {
                            throw errors.PLUGINS_HOOK_BEFORE_INVALID({
                                name: name,
                                plugin: hook.plugin,
                                before: before,
                            });
                        }
                        else {
                            return undefined;
                        }
                    }
                    return [hook, index[before]];
                })
                    .filter(function (hook) {
                    return hook !== undefined;
                });
            })
                .filter(function (hook) {
                return hook !== undefined;
            });
            const edges = [...edges_after, ...edges_before].flat(1);
            return toposort.array(mergedHooks, edges).map((hook) => {
                if (hook) {
                    if ('require' in hook)
                        delete hook.require;
                    if ('plugin' in hook)
                        delete hook.plugin;
                }
                return hook;
            });
        },
        call: function ({ args = [], handler, hooks = [], name }) {
            return __awaiter(this, arguments, void 0, function* () {
                if (arguments.length !== 1) {
                    throw error('PLUGINS_INVALID_ARGUMENTS_NUMBER', [
                        'function `call` expect 1 object argument,',
                        `got ${arguments.length} arguments.`,
                    ]);
                }
                else if (!is_object_literal(arguments[0])) {
                    throw error('PLUGINS_INVALID_ARGUMENT_PROPERTIES', [
                        'function `call` expect argument to be a literal object',
                        'with the properties `name`, `args`, `hooks` and `handler`,',
                        `got ${JSON.stringify(arguments[0])} arguments.`,
                    ]);
                }
                else if (typeof name !== 'string') {
                    throw error('PLUGINS_INVALID_ARGUMENT_NAME', [
                        'function `call` requires a property `name` in its first argument,',
                        `got ${JSON.stringify(arguments[0])} argument.`,
                    ]);
                }
                hooks = this.get({
                    hooks: hooks,
                    name: name,
                });
                let maybeHandler;
                for (const hook of hooks) {
                    switch (hook.handler.length) {
                        case 0:
                        case 1:
                            yield hook.handler.call(this, args);
                            break;
                        case 2:
                            maybeHandler = yield hook.handler.call(this, args, handler);
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
                    return maybeHandler.call(this, args);
                }
            });
        },
        call_sync: function ({ args = [], handler, hooks = [], name }) {
            if (arguments.length !== 1) {
                throw error('PLUGINS_INVALID_ARGUMENTS_NUMBER', [
                    'function `call` expect 1 object argument,',
                    `got ${arguments.length} arguments.`,
                ]);
            }
            else if (!is_object_literal(arguments[0])) {
                throw error('PLUGINS_INVALID_ARGUMENT_PROPERTIES', [
                    'function `call` expect argument to be a literal object',
                    'with the properties `name`, `args`, `hooks` and `handler`,',
                    `got ${JSON.stringify(arguments[0])} arguments.`,
                ]);
            }
            else if (typeof name !== 'string') {
                throw error('PLUGINS_INVALID_ARGUMENT_NAME', [
                    'function `call` requires a property `name` in its first argument,',
                    `got ${JSON.stringify(arguments[0])} argument.`,
                ]);
            }
            hooks = this.get({
                hooks: hooks,
                name: name,
            });
            let maybeHandler;
            for (const hook of hooks) {
                switch (hook.handler.length) {
                    case 0:
                    case 1:
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
                return Promise.resolve(maybeHandler).then((handler) => handler.call(this, args));
            }
        },
    };
    for (const plugin of plugins) {
        registry.register(plugin);
    }
    return registry;
};

export { plugandplay };
