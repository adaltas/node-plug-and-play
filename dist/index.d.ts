type HookHandler<T extends object> = (args: T, handler?: HookHandler<T>) => null | void | HookHandler<T> | Promise<HookHandler<T>>;
interface Hook<T extends object> {
    after?: string[];
    before?: string[];
    handler: HookHandler<T>;
    name?: string;
    plugin?: string;
    require?: string[];
}
interface Plugin<T extends object = object> {
    hooks: {
        [name: string]: Hook<T>[] | Hook<T> | HookHandler<T>;
    };
    name: string;
    require?: string[];
}
interface callArgs<T extends object> {
    args: T;
    handler: HookHandler<T>;
    hooks?: Hook<T>[];
    name: string;
}
interface getArgs<T extends object> {
    hooks?: Hook<T>[];
    name: string;
    sort?: boolean;
}
interface Registry<T extends object = object> {
    call: (args: callArgs<T>) => Promise<unknown>;
    call_sync: (args: callArgs<T>) => unknown;
    get: (args: getArgs<T>) => Hook<T>[];
    register: (userPlugin: Plugin<T> | ((args?: T) => Plugin<T>)) => Registry<T>;
    registered: (name: string) => boolean;
}
type plugangplayArgs<T extends object> = {
    args?: T;
    chain?: Registry<T>;
    parent?: Registry<T>;
    plugins?: Plugin<T>[];
};
declare const plugandplay: <T extends object>({ args, chain, parent, plugins, }?: plugangplayArgs<T>) => Registry<T>;

export { Hook, Plugin, plugandplay };
