import {
  formatIncompletePhoneNumber,
  isValidPhoneNumber,
} from 'libphonenumber-js';

import { ISMSBag } from './@types';

export const isNil = (e: unknown) => e === null || e === undefined;

export const isEmpty = (e: unknown) =>
  e === null || e === undefined || (typeof e === 'string' && e.length === 0);

export const objectHasItems = (e: unknown) =>
  e !== null &&
  e !== undefined &&
  typeof e === 'object' &&
  Object.keys(e as Record<string, unknown>).length > 0;

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
export const useAsyncWithRetry = async <T = unknown>(
  input: () => Promise<T>,
  retries = 3
): Promise<[T, undefined] | [undefined, unknown]> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    const [data, error] = await useAsync(input); // input() called fresh each attempt

    if (!error) return [data as T, undefined];

    lastError = error;
    console.warn(`Attempt ${attempt + 1} failed, retrying...`);
  }

  return [undefined, lastError];
};

export const validateSMSBag = (data: ISMSBag[]): [ISMSBag[], string[]] => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array of SMS bags.');
  }

  const allIncorrectNumbers: string[] = [];
  const processedData: ISMSBag[] = [];

  for (const item of data) {
    if (
      !item ||
      !Array.isArray(item.numbers) ||
      item.numbers.length === 0 ||
      typeof item.message !== 'string' ||
      item.message.trim() === '' ||
      typeof item.sender !== 'string' ||
      item.sender.trim() === ''
    ) {
      throw new Error(
        'Each SMS bag must have a non-empty numbers array, a non-empty message string, and a non-empty sender string.'
      );
    }

    const correctNumbersForBag: string[] = [];
    const incorrectNumbersForBag: string[] = [];

    for (const num of item.numbers) {
      const formattedNum = formatIncompletePhoneNumber(num);
      if (isValidPhoneNumber(formattedNum)) {
        correctNumbersForBag.push(formattedNum);
      } else {
        incorrectNumbersForBag.push(num);
      }
    }

    if (correctNumbersForBag.length > 0) {
      processedData.push({
        ...item,
        numbers: correctNumbersForBag,
      });
    }
    allIncorrectNumbers.push(...incorrectNumbersForBag);
  }

  const uniqueIncorrectNumbers = Array.from(new Set(allIncorrectNumbers));
  return [processedData, uniqueIncorrectNumbers];
};
