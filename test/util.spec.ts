import { expect, test } from "bun:test";

import {
  isEmpty,
  isNil,
  objectHasItems,
  useAsync,
  useAsyncWithRetry,
} from "../src/utils";

test("isNil returns true only for null and undefined", () => {
  expect(isNil(null)).toBe(true);
  expect(isNil(undefined)).toBe(true);
  expect(isNil(false)).toBe(false);
  expect(isNil(0)).toBe(false);
  expect(isNil("value")).toBe(false);
});

test("isEmpty handles nullish and empty string values", () => {
  expect(isEmpty(null)).toBe(true);
  expect(isEmpty(undefined)).toBe(true);
  expect(isEmpty("")).toBe(true);
  expect(isEmpty("value")).toBe(false);
  expect(isEmpty(false)).toBe(false);
  expect(isEmpty(0)).toBe(false);
});

test("objectHasItems only returns true for populated objects", () => {
  expect(objectHasItems({ id: 1 })).toBe(true);
  expect(objectHasItems({})).toBe(false);
  expect(objectHasItems(null)).toBe(false);
  expect(objectHasItems(undefined)).toBe(false);
  expect(objectHasItems([])).toBe(false);
});

test("useAsync resolves a successful promise as a tuple", async () => {
  const [data, error] = await useAsync(Promise.resolve("ok"));

  expect(data).toBe("ok");
  expect(error).toBeUndefined();
});

test("useAsync returns the caught error for failed promises", async () => {
  const failure = new Error("boom");
  const [data, error] = await useAsync(Promise.reject(failure));

  expect(data).toBeUndefined();
  expect(error).toBe(failure);
});

test("useAsync supports lazy promise factories", async () => {
  let called = 0;
  const [data, error] = await useAsync(() => {
    called += 1;
    return Promise.resolve(42);
  });

  expect(called).toBe(1);
  expect(data).toBe(42);
  expect(error).toBeUndefined();
});

test("useAsyncWithRetry retries until a promise succeeds", async () => {
  let attempts = 0;
  const [data, error] = await useAsyncWithRetry(() => {
    attempts += 1;
    if (attempts < 3) {
      return Promise.reject(new Error("temporary failure"));
    }

    return Promise.resolve("recovered");
  }, 3);

  expect(attempts).toBe(3);
  expect(data).toBe("recovered");
  expect(error).toBeUndefined();
});

test("useAsyncWithRetry returns the last error after exhausting retries", async () => {
  const failure = new Error("persistent failure");
  const [data, error] = await useAsyncWithRetry(
    () => Promise.reject(failure),
    2,
  );

  expect(data).toBeUndefined();
  expect(error).toBe(failure);
});
