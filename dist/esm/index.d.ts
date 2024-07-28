export type Handler<Args> = (args: Args, handler?: Handler<Args>) => unknown | void | PromiseLike<unknown>;
export interface Hook<Args> {
    name?: string;
    before?: string | string[];
    after?: string | string[];
    handler: Handler<Args>;
}
export interface NormalizedHook<Args> extends Hook<Args> {
    plugin: string;
    require: string[];
}
export interface Plugin<Args> {
    hooks?: Record<string, Handler<Args> | Hook<Args>>;
    name?: string;
    require?: string | string[];
}
export interface Registry {
    register: <Args>(plugin: (Plugin<Args> | (<Args>(...Args: any[]) => Plugin<Args>))) => Registry;
    registered: (name: string) => boolean;
    get: <Args>(args: {
        name: string;
        hooks?: Handler<Args> | Hook<Args> | Hook<Args>[];
        sort?: boolean;
    }) => NormalizedHook<Args>[];
    call: <Args>(args: {
        args?: Args;
        handler?: Handler<Args>;
        hooks?: Hook<Args>[];
        name: string;
    }) => Promise<unknown>;
    call_sync: <Args>(args: {
        args?: Args;
        handler?: Handler<Args>;
        hooks?: Hook<Args>[];
        name: string;
    }) => unknown;
}
declare const plugandplay: <Args>({ args, chain, parent, plugins, }?: {
    args?: unknown[];
    chain?: unknown;
    parent?: Registry;
    plugins?: (Plugin<Args> | (<Args_1>(...Args: any) => Plugin<Args_1>))[];
}) => Registry;
export { plugandplay };
