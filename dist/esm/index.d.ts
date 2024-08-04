export type Handler<T> = (args: T, handler: Handler<T>) => unknown | void | PromiseLike<unknown> | Handler<T>;
export interface Hook<T> {
    after?: string | string[];
    before?: string | string[];
    name?: PropertyKey;
    handler: Handler<T>;
}
export interface HookNormalized<T, K extends keyof T> {
    after: string[];
    before: string[];
    name: K;
    plugin?: string;
    require?: string[];
    handler: Handler<T[K]>;
}
export interface Plugin<T> {
    hooks: {
        [Name in keyof T]?: Hook<T[Name]>[] | Hook<T[Name]> | Handler<T[Name]>;
    };
    name?: PropertyKey;
    require?: string | string[];
}
export interface PluginNormalized<T> {
    hooks: {
        [Name in keyof T]: HookNormalized<T, Name>[];
    };
    name: PropertyKey | undefined;
    require: string[];
}
export interface Api<T, Chain = undefined> {
    call: <K extends keyof T>(options: {
        args: T[K];
        handler?: Handler<T[K]>;
        hooks?: Hook<T[K]>[];
        name: K;
    }) => Promise<unknown>;
    call_sync: <K extends keyof T>(args: {
        args: T[K];
        handler?: Handler<T[K]>;
        hooks?: Hook<T[K]>[];
        name: K;
    }) => unknown;
    get: <K extends keyof T>(args: {
        name: K;
        hooks?: Handler<T[K]> | Hook<T[K]> | Hook<T[K]>[];
        sort?: boolean;
    }) => HookNormalized<T, K>[];
    register: (plugin: Plugin<T> | ((...Args: unknown[]) => Plugin<T>)) => Api<T, Chain> | NonNullable<Chain>;
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
    parent?: Api<T>;
    plugins?: (Plugin<T> | (<FnArgs, T_1>(...Args: FnArgs[]) => Plugin<T_1>))[];
}) => Api<T, Chain>;
export { plugandplay };
