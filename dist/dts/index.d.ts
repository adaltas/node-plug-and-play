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
        [name in keyof T]: Hook<T[name]>[] | Hook<T[name]> | HookHandler<T[name]>;
    };
    name: PropertyKey;
    require?: string[];
}
interface callArguments<T, K extends keyof T> {
    args: T[K];
    handler: HookHandler<T[K]>;
    hooks?: Hook<T[K]>[];
    name: K;
}
interface getArguments<T, K extends keyof T> {
    hooks?: Hook<T[K]>[];
    name: K;
    sort?: boolean;
}
type CallFunction<T> = <K extends keyof T>(args: callArguments<T, K>) => Promise<unknown>;
type CallSyncFunction<T> = <K extends keyof T>(args: callArguments<T, K>) => unknown;
type GetFunction<T> = <K extends keyof T>(args: getArguments<T, K>) => Hook<T[K]>[];
interface Registry<T> {
    call: CallFunction<T>;
    call_sync: CallSyncFunction<T>;
    get: GetFunction<T>;
    register: (userPlugin: Plugin<T> | ((...args: unknown[]) => Plugin<T>)) => Registry<T>;
    registered: (name: PropertyKey) => boolean;
}
interface plugangplayArguments<T> {
    args?: unknown[];
    chain?: Registry<T>;
    parent?: Registry<T>;
    plugins?: Plugin<T>[];
}
declare const plugandplay: <T extends Record<string, unknown> = Record<string, unknown>>({ args, chain, parent, plugins, }?: plugangplayArguments<T>) => Registry<T>;
export { plugandplay };
