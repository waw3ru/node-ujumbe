/**
 * Wraps a Promise in a `[data, error]` tuple, eliminating the need for
 * try/catch blocks and letting you handle errors inline.
 *
 * Accepts either an already-invoked Promise or a lazy factory function.
 *
 * @template T - The resolved value type of the promise.
 *
 * @param input - A `Promise<T>` or a factory `() => Promise<T>` to execute.
 *
 * @returns A Promise that always resolves to a tuple:
 * - `[T, undefined]` on success
 * - `[undefined, unknown]` on failure
 *
 * @example
 * // Eager promise
 * const [user, error] = await useAsync<User>(fetchUser(id));
 * if (error) return handleError(error);
 * console.log(user.name);
 *
 * @example
 * // Lazy factory (defers execution)
 * const [data, error] = await useAsync(() => fetchReport(filters));
 *
 * @example
 * // Narrowing the error type
 * const [order, error] = await useAsync<Order>(placeOrder(cart));
 * if (error instanceof ApiError) showToast(error.message);
 */
export const useAsync = async <T = unknown>(
  input: Promise<T> | (() => Promise<T>)
): Promise<[T, undefined] | [undefined, unknown]> => {
  try {
    const response = await (typeof input === 'function' ? input() : input);
    return [response, undefined];
  } catch (error) {
    return [undefined, error];
  }
};
