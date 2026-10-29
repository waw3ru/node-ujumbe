export declare const useAsync: <T = unknown>(
  input: Promise<T> | (() => Promise<T>)
) => Promise<[T, undefined] | [undefined, unknown]>;
