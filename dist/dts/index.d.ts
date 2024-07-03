export type HookHandler<T> = (args: T, handler?: HookHandler<T>) => null | void | HookHandler<T> | Promise<HookHandler<T>>;
export interface Hook<T> {
    after?: string | string[];
    before?: string | string[];
    handler: HookHandler<T>;
    name?: PropertyKey;
    plugin?: string;
    require?: string | string[];
}
export interface Plugin<T> {
    hooks: {
        [name in keyof T]?: Hook<T[name]>[] | Hook<T[name]> | HookHandler<T[name]>;
    };
    name: PropertyKey;
    require?: string | string[];
}
interface CallFunctionParams<T, K extends keyof T> {
    args: T[K];
    handler: HookHandler<T[K]>;
    hooks?: Hook<T[K]>[];
    name: K;
}
interface GetFunctionParams<T, K extends keyof T> {
    hooks?: Hook<T[K]>[];
    name: K;
    sort?: boolean;
}
type CallFunction<T> = <K extends keyof T>(args: CallFunctionParams<T, K>) => Promise<unknown>;
type CallSyncFunction<T> = <K extends keyof T>(args: CallFunctionParams<T, K>) => unknown;
type GetFunction<T> = <K extends keyof T>(args: GetFunctionParams<T, K>) => NormalizedHook<T, K>[];
export interface Registry<T> {
    call: CallFunction<T>;
    call_sync: CallSyncFunction<T>;
    get: GetFunction<T>;
    register: (userPlugin: Plugin<T> | ((...args: unknown[]) => Plugin<T>)) => Registry<T>;
    registered: (name: PropertyKey) => boolean;
}
interface plugangplayParams<T> {
    args?: unknown[];
    chain?: Registry<T>;
    parent?: Registry<T>;
    plugins?: Plugin<T>[];
}
interface NormalizedHook<T, K extends keyof T> {
    after?: string[];
    before?: string[];
    handler: HookHandler<T[K]>;
    name: K;
    plugin?: string;
    require?: string | string[];
}
declare const plugandplay: <T extends Record<string, unknown> = Record<string, unknown>>({ args, chain, parent, plugins, }?: plugangplayParams<T>) => Registry<T>;
export { plugandplay };
