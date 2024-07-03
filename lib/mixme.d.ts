declare module 'mixme' {
  function is_object(el: unknown): el is object;
  function is_object_literal(el: unknown): el is object;
  function merge(...data: object[]): object;
}
