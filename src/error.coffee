
class PlugAndPlayError extends Error
  constructor: (code, message, ...contexts) ->
    message = message
    .filter (line) -> !!line
    .join(' ') if Array.isArray message
    message = "#{code}: #{message}"
    super message
    if Error.captureStackTrace
      Error.captureStackTrace this, PlugAndPlayError
    this.code = code
    for context in contexts
      for key of context
        continue if key is 'code'
        value = context[key]
        continue if value is undefined
        this[key] = if Buffer.isBuffer value
        then value.toString()
        else if value is null
        then value
        else JSON.parse JSON.stringify value

module.exports = ->
  new PlugAndPlayError ...arguments
