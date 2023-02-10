type HookHandler<T extends Record<string, unknown>> = (args: T, handler?: HookHandler<any>) => null | void | HookHandler<any> | Promise<HookHandler<any>>;
interface Hook {
    after?: string[];
    before?: string[];
    handler: HookHandler<any>;
    name?: string;
    plugin?: string;
    require?: string[];
}
interface Plugin {
    hooks: {
        [name: string]: Hook[] | Hook | HookHandler<any>;
    };
    name: string;
    require?: string[];
}
interface callArgs<T extends Record<string, unknown>> {
    args?: T;
    handler: HookHandler<T>;
    hooks?: Hook[];
    name: string;
}
interface getArgs {
    hooks?: Hook[];
    name: string;
    sort?: boolean;
}
interface Registry {
    call: (args: callArgs<any>) => Promise<unknown>;
    call_sync: (args: callArgs<any>) => unknown;
    get: (args: getArgs) => Hook[];
    register: (userPlugin: Plugin | ((args?: object) => Plugin)) => Registry;
    registered: (name: string) => boolean;
}
type plugangplayArgs = {
    args?: Record<string, unknown>;
    chain?: Registry;
    parent?: Registry;
    plugins?: Plugin[];
};
declare const plugandplay: ({ args, chain, parent, plugins, }?: plugangplayArgs) => Registry;

export { Hook, HookHandler, Plugin, Registry, plugandplay };
