declare class PlugableError extends Error {
    code: string;
    [index: string]: unknown;
    constructor(code: string, message: string | (string | object)[], ...contexts: Record<string, unknown>[]);
}
export { PlugableError };
declare const _default: (code: string, message: string | (string | object)[], ...contexts: Record<string, unknown>[]) => PlugableError;
export default _default;
