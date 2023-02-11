type HookHandler<T extends object> = (args: T, handler?: HookHandler<object>) => null | void | HookHandler<object> | Promise<HookHandler<object>>;
interface Hook {
    after?: string[];
    before?: string[];
    handler: HookHandler<object>;
    name?: string;
    plugin?: string;
    require?: string[];
}
interface Plugin {
    hooks: {
        [name: string]: Hook[] | Hook | HookHandler<object>;
    };
    name: string;
    require?: string[];
}
interface callArgs<T extends object> {
    args: T | [];
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
    call: (args: callArgs<object>) => Promise<unknown>;
    call_sync: (args: callArgs<object>) => unknown;
    get: (args: getArgs) => Hook[];
    register: (userPlugin: Plugin | ((args?: object) => Plugin)) => Registry;
    registered: (name: string) => boolean;
}
type plugangplayArgs = {
    args?: object;
    chain?: Registry;
    parent?: Registry;
    plugins?: Plugin[];
};
declare const plugandplay: ({ args, chain, parent, plugins, }?: plugangplayArgs) => Registry;

export { Hook, HookHandler, Plugin, Registry, plugandplay };
