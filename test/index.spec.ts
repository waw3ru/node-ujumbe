import { afterEach, beforeEach, expect, mock, test } from "bun:test";

import type { ISMSResponse } from "../src/@types";
import { sendSMS } from "../src/index";

const originalFetch = globalThis.fetch;

type FetchMock = typeof fetch & {
  mock: { calls: unknown[][] };
};

type MockResponseBody = Partial<ISMSResponse> | Record<string, unknown>;

const mockFetch = (implementation: (...args: Parameters<typeof fetch>) => Promise<Response>): FetchMock => mock(implementation) as unknown as FetchMock;

const createResponse = (options: { ok?: boolean; status?: number; body?: MockResponseBody }) => {
  const payload = options.body === undefined ? {} : options.body;
  return new Response(JSON.stringify(payload), {
    status: options.status ?? 200,
    headers: { "Content-Type": "application/json" },
  }) as Response;
};

beforeEach(() => {
  globalThis.fetch = mockFetch(async () => createResponse({ ok: true, status: 200, body: { success: true } })) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("returns the parsed payload when the API request succeeds", async () => {
  const payload = {
    status: {
      code: "1008",
      type: "success",
      description: "Yourmessageshavebeenqueued",
    },
    meta: {
      recipients: 3,
      credits_deducted: 3,
      available_credits: "6608",
      user: "yourregisteredname",
      date_time: {
        date: "2015­08­1518:19:47",
        timezone_type: 3,
        timezone: "Africa/Nairobi",
      },
    },
  };
  const request = [{ numbers: ["254700000000"], message: "Hello", sender: "TEST" }];
  const options = { email: "user@example.com", apiKey: "secret-key" };

  const fetchMock = mockFetch(async () => createResponse({ ok: true, status: 200, body: payload }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const [data, error] = await sendSMS(request, options);

  expect(data).toEqual(payload);
  expect(error).toBeUndefined();
  expect(fetchMock.mock.calls).toHaveLength(1);
});

test("returns the original error when the request itself fails", async () => {
  const request = [{ numbers: ["254700000000"], message: "Hello", sender: "TEST" }];
  const options = { email: "user@example.com", apiKey: "secret-key" };

  globalThis.fetch = mockFetch(async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;

  const [data, error] = await sendSMS(request, options);

  expect(data).toBeUndefined();
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe("network down");
});

test("returns the expected error for each non-success status code", async () => {
  const request = [{ numbers: ["254700000000"], message: "Hello", sender: "TEST" }];
  const options = { email: "user@example.com", apiKey: "secret-key" };

  const cases = [
    { status: 404, message: "API endpoint not found. Please check the URL and try again." },
    { status: 401, message: "Unauthorized. Please check your API key and email." },
    { status: 403, message: "Forbidden. You do not have permission to access this resource." },
    { status: 400, message: "Bad request. Please check the request payload and try again." },
    { status: 500, message: "Internal server error. Please try again later." },
    { status: 418, message: "An unknown error occurred. Please try again later." },
  ];

  for (const testCase of cases) {
    globalThis.fetch = mockFetch(async () => createResponse({ ok: false, status: testCase.status, body: {} })) as unknown as typeof fetch;
    const [data, error] = await sendSMS(request, options);

    expect(data).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(testCase.message);
  }
});

test("returns the json parsing error when the response body cannot be parsed", async () => {
  const request = [{ numbers: ["254700000000"], message: "Hello", sender: "TEST" }];
  const options = { email: "user@example.com", apiKey: "secret-key" };

  const malformedResponse = {
    ok: true,
    status: 200,
    json: async () => {
      throw new Error("invalid json");
    },
  } as unknown as Response;

  globalThis.fetch = mockFetch(async () => malformedResponse) as unknown as typeof fetch;

  const [data, error] = await sendSMS(request, options);

  expect(data).toBeUndefined();
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe("invalid json");
});
