
module.exports =
  array_flatten: (arr, depth=-1) ->
    ret = []
    for i in [0 ... arr.length]
      if Array.isArray arr[i]
        if depth is 0
          ret.push arr[i]...
        else
          ret.push module.exports.array_flatten(arr[i], depth - 1)...
      else
        ret.push arr[i]
    ret
