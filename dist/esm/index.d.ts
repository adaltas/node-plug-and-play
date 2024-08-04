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
export interface PlugAndPlay<T, Chain = undefined> {
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
    register: (plugin: Plugin<T> | ((...Args: unknown[]) => Plugin<T>)) => PlugAndPlay<T, Chain> | NonNullable<Chain>;
    registered: (name: PropertyKey) => boolean;
}
declare const plugandplay: <T extends Record<string, unknown> = Record<string, unknown>, Chain = undefined>({ args, chain, parent, plugins, }?: {
    args?: unknown[];
    chain?: Chain;
    parent?: PlugAndPlay<T>;
    plugins?: (Plugin<T> | (<FnArgs, T_1>(...Args: FnArgs[]) => Plugin<T_1>))[];
}) => PlugAndPlay<T, Chain>;
export { plugandplay };
