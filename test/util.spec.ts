import { expect, test } from 'bun:test';

import {
  isEmpty,
  isNil,
  objectHasItems,
  useAsync,
  useAsyncWithRetry,
  validateSMSBag,
} from '../src/utils';

test('isNil returns true only for null and undefined', () => {
  expect(isNil(null)).toBe(true);
  expect(isNil(undefined)).toBe(true);
  expect(isNil(false)).toBe(false);
  expect(isNil(0)).toBe(false);
  expect(isNil('value')).toBe(false);
});

test('isEmpty handles nullish and empty string values', () => {
  expect(isEmpty(null)).toBe(true);
  expect(isEmpty(undefined)).toBe(true);
  expect(isEmpty('')).toBe(true);
  expect(isEmpty('value')).toBe(false);
  expect(isEmpty(false)).toBe(false);
  expect(isEmpty(0)).toBe(false);
});

test('objectHasItems only returns true for populated objects', () => {
  expect(objectHasItems({ id: 1 })).toBe(true);
  expect(objectHasItems({})).toBe(false);
  expect(objectHasItems(null)).toBe(false);
  expect(objectHasItems(undefined)).toBe(false);
  expect(objectHasItems([])).toBe(false);
});

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

test('useAsync resolves a successful promise as a tuple', async () => {
  const [data, error] = await useAsync(Promise.resolve('ok'));

  expect(data).toBe('ok');
  expect(error).toBeUndefined();
});

test('useAsync returns the caught error for failed promises', async () => {
  const failure = new Error('boom');
  const [data, error] = await useAsync(Promise.reject(failure));

  expect(data).toBeUndefined();
  expect(error).toBe(failure);
});

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

test('useAsyncWithRetry returns the last error after exhausting retries', async () => {
  const failure = new Error('persistent failure');
  const [data, error] = await useAsyncWithRetry(
    () => Promise.reject(failure),
    2
  );

  expect(data).toBeUndefined();
  expect(error).toBe(failure);
});
