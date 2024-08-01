export type Handler<Args> = (handlerArgs: Args, handler?: Handler<Args>) => unknown | void | PromiseLike<unknown>;
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
export interface Registry<Args, Chain = undefined> {
    register: (plugin: Plugin<Args> | (<FnArgs, Args>(...Args: FnArgs[]) => Plugin<Args>)) => Registry<Args, Chain> | NonNullable<Chain>;
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
declare const plugandplay: <Args, Chain = undefined>({ args, chain, parent, plugins, }?: {
    args?: unknown[];
    chain?: Chain;
    parent?: Registry<Args>;
    plugins?: (Plugin<Args> | (<FnArgs, Args_1>(...Args: FnArgs[]) => Plugin<Args_1>))[];
}) => Registry<Args, Chain>;
export { plugandplay };
