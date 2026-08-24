import { expect, test } from 'bun:test';

import { validateSMSBag } from '../src/validate';

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
