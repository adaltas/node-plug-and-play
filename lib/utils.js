export const array_flatten = function (items, depth = -1) {
  const result = [];
  for (const item of items) {
    if (Array.isArray(item)) {
      if (depth === 0) {
        result.push(...item);
      }
      else {
        result.push(...array_flatten(item, depth - 1));
      }
    }
    else {
      result.push(item);
    }
  }
  return result;
};
export default {
  array_flatten
};
