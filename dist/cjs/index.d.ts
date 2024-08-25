declare class PlugableError extends Error {
    code: string;
    [index: string]: unknown;
    constructor(code: string, message: string | (string | object)[], ...contexts: Record<string, unknown>[]);
}

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
type Handler<T> = (args: T, handler: Handler<T>) => unknown | void | PromiseLike<unknown> | Handler<T>;
/**
 * Represents a hook in the Plug-and-Play system.
 *
 * @typeParam T - The type of the arguments expected by the hook handlers.
 * @property after - List of plugin names with hooks of the same name that should be executed after this hook. If a string is provided, it is coerced to an array.
 * @property before - List of plugin names with hooks of the same name that should be executed before this hook. If a string is provided, it is coerced to an array.
 * @property handler - The hook handler to be executed.
 * @property name - Name to identify the hook.
 */
interface Hook<T> {
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
interface HookNormalized<T, K extends keyof T> {
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
interface Plugin<T> {
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
interface PluginNormalized<T> {
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
interface Api<T, Chain = undefined> {
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
    register: (plugin: Plugin<T> | ((...Args: unknown[]) => Plugin<T>)) => Chain extends undefined ? this : Chain;
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
declare const plugandplay: <T extends Record<string, unknown> = Record<string, unknown>, Chain = undefined>({ args, chain, parent, plugins, }?: {
    args?: unknown[];
    chain?: Chain;
    parent?: Api<T, Chain>;
    plugins?: (Plugin<T> | (<FnArgs, T_1>(...Args: FnArgs[]) => Plugin<T_1>))[];
}) => Api<T, Chain>;

export { type Api, type Handler, type Hook, type HookNormalized, PlugableError, type Plugin, type PluginNormalized, plugandplay };
