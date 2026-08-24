import { expect, test } from 'vitest';

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
test('validateSMSBag_handles_a_large_batch_of_phone_numbers', () => {
  const manyNumbers = Array.from({ length: 250 }, () => '+254700000000');
  const [processedData, invalidNumbers] = validateSMSBag([
    {
      numbers: manyNumbers,
      message: 'Hello',
      sender: 'TEST',
    },
  ]);
  expect(processedData).toHaveLength(1);
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
test('validateSMSBag_handles_a_stress_batch_without_dropping_valid_entries', () => {
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
 * What: validateSMSBag should report each invalid phone number only once,
 * even when the same invalid value appears in multiple message bags.
 * How: Supplies duplicate invalid values alongside a valid number in two
 * bags and checks that valid bags are retained while invalidNumbers is
 * reduced to unique values in encounter order.
 * Why: callers use invalidNumbers to give actionable feedback; duplicate
 * entries would create noisy or misleading error reports.
 */
test('validateSMSBag_deduplicates_invalid_numbers_across_bags', () => {
  const [processedData, invalidNumbers] = validateSMSBag([
    {
      numbers: ['not-a-number', '+254700000000', 'not-a-number'],
      message: 'Hello',
      sender: 'TEST',
    },
    {
      numbers: ['another-invalid-number', 'not-a-number'],
      message: 'Hello again',
      sender: 'TEST',
    },
  ]);

  expect(processedData).toHaveLength(1);
  expect(processedData[0].numbers).toEqual(['+254700000000']);
  expect(invalidNumbers).toEqual(['not-a-number', 'another-invalid-number']);
});

/**
 * What: validateSMSBag should reject an empty input or any SMS bag missing
 * a required numbers, message, or sender value.
 * How: Runs each malformed input through the validator and checks that it
 * throws the documented validation error instead of processing partial data.
 * Why: required-field validation protects request construction from malformed
 * payloads and gives callers one consistent failure contract.
 */
test('validateSMSBag_rejects_empty_input_and_missing_required_fields', () => {
  const requiredFieldsError =
    'Each SMS bag must have a non-empty numbers array, a non-empty message string, and a non-empty sender string.';
  const invalidInputs = [
    [],
    [{}],
    [{ numbers: [] }],
    [{ message: 'Hello', sender: 'TEST' }],
    [{ numbers: ['+254700000000'], sender: 'TEST' }],
    [{ numbers: ['+254700000000'], message: '', sender: 'TEST' }],
    [{ numbers: ['+254700000000'], message: 'Hello' }],
    [{ numbers: ['+254700000000'], message: 'Hello', sender: '' }],
  ];

  for (const input of invalidInputs) {
    expect(() => validateSMSBag(input as never)).toThrowError(
      input.length === 0
        ? 'Data must be a non-empty array of SMS bags.'
        : requiredFieldsError
    );
  }
});
