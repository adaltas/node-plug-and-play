const PlugableError = class PlugableError extends Error {
  constructor(code, message, ...contexts) {
    if (Array.isArray(message)) {
      message = message.filter(function (line) {
        return !!line;
      }).join(' ');
    }
    message = `${code}: ${message}`;
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PlugableError);
    }
    this.code = code;
    for (let i = 0; i < contexts.length; i++) {
      const context = contexts[i];
      for (const key in context) {
        if (key === 'code') {
          continue;
        }
        const value = context[key];
        if (value === void 0) {
          continue;
        }
        this[key] = Buffer.isBuffer(value) ? value.toString() : value === null ? value : JSON.parse(JSON.stringify(value));
      }
    }
  }
};
export default (function () {
  return new PlugableError(...arguments);
});
