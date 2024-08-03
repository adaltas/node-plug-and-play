export type Handler<T> = (args: T, handler: Handler<T>) => unknown | void | PromiseLike<unknown> | Handler<T>;
export interface Hook<T> {
    after?: string | string[];
    before?: string | string[];
    name?: PropertyKey;
    handler: Handler<T>;
}
export interface NormalizedHook<T, K extends keyof T> {
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
        [Name in keyof T]: NormalizedHook<T, Name>[];
    };
    name: PropertyKey | undefined;
    require: string[];
}
interface RegistryCallParams<T, K extends keyof T> {
    args?: T[K];
    handler?: Handler<T[K]>;
    hooks?: Hook<T[K]>[];
    name: K;
}
type RegistryCall<T> = <K extends keyof T>(args: RegistryCallParams<T, K>) => Promise<unknown>;
type RegistryCallSync<T> = <K extends keyof T>(args: {
    args?: T[K];
    handler?: Handler<T[K]>;
    hooks?: Hook<T[K]>[];
    name: K;
}) => unknown;
interface RegistryGetParams<T, K extends keyof T> {
    name: K;
    hooks?: Handler<T[K]> | Hook<T[K]> | Hook<T[K]>[];
    sort?: boolean;
}
type RegistryGet<T> = <K extends keyof T>(args: RegistryGetParams<T, K>) => NormalizedHook<T, K>[];
type RegistryRegister<T, Chain> = (plugin: Plugin<T> | ((...Args: unknown[]) => Plugin<T>)) => Registry<T, Chain> | NonNullable<Chain>;
export interface Registry<T, Chain = undefined> {
    call: RegistryCall<T>;
    call_sync: RegistryCallSync<T>;
    get: RegistryGet<T>;
    register: RegistryRegister<T, Chain>;
    registered: (name: PropertyKey) => boolean;
}
declare const plugandplay: <T extends Record<string, unknown> = Record<string, unknown>, Chain = undefined>({ args, chain, parent, plugins, }?: {
    args?: unknown[];
    chain?: Chain;
    parent?: Registry<T>;
    plugins?: (Plugin<T> | (<FnArgs, T_1>(...Args: FnArgs[]) => Plugin<T_1>))[];
}) => Registry<T, Chain>;
export { plugandplay };
