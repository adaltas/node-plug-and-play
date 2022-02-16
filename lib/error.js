
const PlugableError = class PlugableError extends Error {
  constructor(code, message, ...contexts) {
    var context, i, key, len, value;
    if (Array.isArray(message)) {
      message = message.filter(function(line) {
        return !!line;
      }).join(' ');
    }
    message = `${code}: ${message}`;
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PlugableError);
    }
    this.code = code;
    for (i = 0, len = contexts.length; i < len; i++) {
      context = contexts[i];
      for (key in context) {
        if (key === 'code') {
          continue;
        }
        value = context[key];
        if (value === void 0) {
          continue;
        }
        this[key] = Buffer.isBuffer(value) ? value.toString() : value === null ? value : JSON.parse(JSON.stringify(value));
      }
    }
  }

};

module.exports = function() {
  return new PlugableError(...arguments);
};
