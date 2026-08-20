import { expect, test } from 'bun:test';

import {
  isEmpty,
  isNil,
  objectHasItems,
  useAsync,
  useAsyncWithRetry,
  validateSMSBag,
} from '../src/utils';

/**
 * What: isNil should return true only for null and undefined, and false
 * for every other falsy or truthy value.
 * How: Checks isNil against null, undefined, and a spread of other
 * falsy/valid values (false, 0, a non-empty string) that should not be
 * treated as nil.
 * Why: nil-checks are easy to get subtly wrong by conflating "nullish"
 * with "falsy" -- a naive implementation using `!value` would
 * incorrectly treat false and 0 as nil. This guards against that.
 */
test('isNil returns true only for null and undefined', () => {
  expect(isNil(null)).toBe(true);
  expect(isNil(undefined)).toBe(true);
  expect(isNil(false)).toBe(false);
  expect(isNil(0)).toBe(false);
  expect(isNil('value')).toBe(false);
});

/**
 * What: isEmpty should treat null, undefined, and the empty string as
 * empty, while leaving other falsy values (false, 0) and non-empty
 * strings unaffected.
 * How: Checks isEmpty against nullish values, an empty string, a
 * non-empty string, and other falsy non-string values.
 * Why: distinguishes "empty" from "nil" and from "falsy" -- three
 * related but different concepts this codebase relies on being handled
 * consistently, especially since 0 and false are valid, non-empty values
 * elsewhere in this library (e.g. message/credit counts).
 */
test('isEmpty handles nullish and empty string values', () => {
  expect(isEmpty(null)).toBe(true);
  expect(isEmpty(undefined)).toBe(true);
  expect(isEmpty('')).toBe(true);
  expect(isEmpty('value')).toBe(false);
  expect(isEmpty(false)).toBe(false);
  expect(isEmpty(0)).toBe(false);
});

/**
 * What: objectHasItems should return true only for a plain object with
 * at least one own property, and false for an empty object, nullish
 * values, and arrays.
 * How: Checks objectHasItems against a populated object, an empty
 * object, null, undefined, and an empty array.
 * Why: this helper is used to branch on "is there actually data here"
 * rather than just "is this truthy" -- an empty object or array is
 * truthy in JS but should not count as having items, and arrays are
 * excluded to keep this check specific to plain objects.
 */
test('objectHasItems only returns true for populated objects', () => {
  expect(objectHasItems({ id: 1 })).toBe(true);
  expect(objectHasItems({})).toBe(false);
  expect(objectHasItems(null)).toBe(false);
  expect(objectHasItems(undefined)).toBe(false);
  expect(objectHasItems([])).toBe(false);
});

/**
 * What: validateSMSBag should normalize valid phone numbers to a
 * consistent format and separate out numbers that can't be validated at
 * all, for a single bag containing a mix of both.
 * How: Passes one bag with two validly-formatted numbers (one missing a
 * leading '+', one already normalized) and one malformed number, then
 * asserts the bag's numbers come back normalized and the malformed
 * number is returned separately as invalid.
 * Why: this is the core validation/cleanup behavior the rest of the
 * library depends on -- getting normalization and invalid-number
 * separation right here is what lets sendSMS keep good numbers in a
 * batch while reporting bad ones back to the caller.
 */
test('validateSMSBag normalizes phone numbers before validation', () => {
  const [processedData, invalidNumbers] = validateSMSBag([
    {
      numbers: ['254700000000', '+254700000001', 'not-a-number'],
      message: 'Hello',
      sender: 'TEST',
    },
  ]);
  expect(processedData).toHaveLength(1);
  expect(processedData[0].numbers).toEqual(['+254700000000', '+254700000001']);
  expect(invalidNumbers).toEqual(['not-a-number']);
});

/**
 * What: validateSMSBag should handle a large number of recipients in a
 * single bag without dropping any valid entries or misclassifying them
 * as invalid.
 * How: Builds a bag with 250 identical, validly-formatted numbers and
 * asserts all 250 come through as processed and none are flagged
 * invalid.
 * Why: guards against off-by-one errors, batching/chunking bugs, or
 * performance shortcuts that silently truncate large recipient lists --
 * a real campaign could plausibly send to hundreds of numbers at once.
 */
test('validateSMSBag handles a large batch of phone numbers', () => {
  const manyNumbers = Array.from({ length: 250 }, () => '254700000000');
  const [processedData, invalidNumbers] = validateSMSBag([
    {
      numbers: manyNumbers,
      message: 'Hello',
      sender: 'TEST',
    },
  ]);
  expect(processedData).toHaveLength(1);
  expect(processedData[0].numbers).toHaveLength(250);
  expect(invalidNumbers).toEqual([]);
});

/**
 * What: validateSMSBag should correctly process many separate bags in
 * one call, not just many numbers within a single bag.
 * How: Builds 100 separate single-number bags and asserts all 100 are
 * returned as processed, each with its number normalized, and none
 * flagged invalid.
 * Why: exercises the across-bags iteration path distinctly from the
 * within-a-bag path tested above -- a bug that only manifests when
 * looping over multiple bags (e.g. state leaking or being reset
 * incorrectly between bags) wouldn't be caught by a single-bag test.
 */
test('validateSMSBag handles a stress batch without dropping valid entries', () => {
  const manyBags = Array.from({ length: 100 }, () => ({
    numbers: ['254700000000'],
    message: 'Hello',
    sender: 'TEST',
  }));
  const [processedData, invalidNumbers] = validateSMSBag(manyBags);
  expect(processedData).toHaveLength(100);
  expect(processedData.every(item => item.numbers[0].startsWith('+254'))).toBe(
    true
  );
  expect(invalidNumbers).toEqual([]);
});

/**
 * What: useAsync should resolve a successful promise as a [data, error]
 * tuple with the resolved value in the first slot and no error.
 * How: Wraps an already-resolved promise and asserts the returned tuple
 * has the expected value and an undefined error.
 * Why: this is the baseline success case for the tuple-wrapping pattern
 * the rest of the library's async error handling depends on -- confirms
 * the happy path doesn't get mangled on its way through the wrapper.
 */
test('useAsync resolves a successful promise as a tuple', async () => {
  const [data, error] = await useAsync(Promise.resolve('ok'));
  expect(data).toBe('ok');
  expect(error).toBeUndefined();
});

/**
 * What: useAsync should catch a rejected promise and return the
 * original rejection reason as the error element of the tuple, rather
 * than letting the rejection propagate.
 * How: Wraps an already-rejected promise and asserts the tuple's data
 * slot is undefined and the error slot is the exact same Error instance
 * that was rejected with.
 * Why: this is the mechanism the whole codebase relies on for the
 * "never throws" guarantee -- if useAsync let a rejection through
 * unchanged, every caller built on top of it would too.
 */
test('useAsync returns the caught error for failed promises', async () => {
  const failure = new Error('boom');
  const [data, error] = await useAsync(Promise.reject(failure));
  expect(data).toBeUndefined();
  expect(error).toBe(failure);
});

/**
 * What: useAsync should accept a function that produces a promise (a
 * lazy factory), not just an already-created promise, calling it
 * exactly once and resolving to its result as a tuple.
 * How: Passes a factory function that increments a counter and returns
 * a resolved promise, then asserts it was called exactly once and the
 * tuple carries the resolved value.
 * Why: distinguishes eager-promise input from lazy-factory input --
 * important because a factory isn't evaluated until useAsync actually
 * calls it, unlike a promise which starts running as soon as it's
 * constructed. Confirms no double-invocation or missed invocation.
 */
test('useAsync supports lazy promise factories', async () => {
  let called = 0;
  const [data, error] = await useAsync(() => {
    called += 1;
    return Promise.resolve(42);
  });
  expect(called).toBe(1);
  expect(data).toBe(42);
  expect(error).toBeUndefined();
});

/**
 * What: useAsyncWithRetry should retry a failing operation up to the
 * given limit and return the eventual successful result once one of the
 * attempts succeeds.
 * How: Passes a factory that fails on its first two calls and succeeds
 * on the third, with a retry limit of 3, then asserts it was called
 * exactly 3 times and the tuple carries the successful result with no
 * error.
 * Why: retry logic is easy to get wrong at the boundaries -- retrying
 * one too many or too few times, or not stopping once a retry succeeds.
 * This confirms it stops exactly at the successful attempt.
 */
test('useAsyncWithRetry retries until a promise succeeds', async () => {
  let attempts = 0;
  const [data, error] = await useAsyncWithRetry(() => {
    attempts += 1;
    if (attempts < 3) {
      return Promise.reject(new Error('temporary failure'));
    }
    return Promise.resolve('recovered');
  }, 3);
  expect(attempts).toBe(3);
  expect(data).toBe('recovered');
  expect(error).toBeUndefined();
});

/**
 * What: useAsyncWithRetry should give up after exhausting its retry
 * limit and return the last error encountered, rather than retrying
 * indefinitely or throwing.
 * How: Passes a factory that always rejects with the same error and a
 * retry limit of 2, then asserts the tuple's data is undefined and the
 * error is the same rejection value.
 * Why: complements the retry-until-success test by covering the other
 * boundary -- confirms the retry loop actually terminates and reports a
 * usable error instead of retrying forever or swallowing the failure.
 */
test('useAsyncWithRetry returns the last error after exhausting retries', async () => {
  const failure = new Error('persistent failure');
  const [data, error] = await useAsyncWithRetry(
    () => Promise.reject(failure),
    2
  );
  expect(data).toBeUndefined();
  expect(error).toBe(failure);
});
