export declare const isNil: (e: unknown) => e is null | undefined;
export declare const isEmpty: (e: unknown) => boolean;
export declare const objectHasItems: (e: unknown) => boolean;
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
export declare const useAsync: <T = unknown>(input: Promise<T> | (() => Promise<T>)) => Promise<[T, undefined] | [undefined, unknown]>;
/**
 * Wraps a lazy Promise factory in a `[data, error]` tuple with automatic
 * retry logic on failure.
 *
 * Accepts only a factory function `() => Promise<T>` — not an eager Promise —
 * since retrying requires a fresh Promise on each attempt.
 *
 * @template T - The resolved value type of the promise.
 *
 * @param input - A factory `() => Promise<T>` to execute. Called once per attempt.
 * @param retries - Maximum number of attempts before giving up. Defaults to `3`.
 *
 * @returns A Promise that always resolves to a tuple:
 * - `[T, undefined]` if any attempt succeeds
 * - `[undefined, unknown]` if all attempts fail, with the last error
 *
 * @example
 * // Retries up to 3 times (default)
 * const [user, error] = await useAsyncWithRetry(() => fetchUser(id));
 * if (error) return handleError(error);
 * console.log(user.name);
 *
 * @example
 * // Custom retry count
 * const [report, error] = await useAsyncWithRetry(() => generateReport(filters), 5);
 *
 * @see {@link useAsync} for the base wrapper without retry logic.
 */
export declare const useAsyncWithRetry: <T = unknown>(input: () => Promise<T>, retries?: number) => Promise<[T, undefined] | [undefined, unknown]>;
