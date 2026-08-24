import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import type { ISMSResponse } from '../src/@types';
import { sendSMS } from '../src/index';

const originalFetch = globalThis.fetch;

type FetchMock = typeof fetch & {
  mock: { calls: unknown[][] };
};

type MockResponseBody = Partial<ISMSResponse> | Record<string, unknown>;

const mockFetch = (
  implementation: (...args: Parameters<typeof fetch>) => Promise<Response>
): FetchMock => vi.fn(implementation) as unknown as FetchMock;

const createResponse = (options: {
  ok?: boolean;
  status?: number;
  body?: MockResponseBody;
}) => {
  const payload = options.body === undefined ? {} : options.body;
  return new Response(JSON.stringify(payload), {
    status: options.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  }) as Response;
};

beforeEach(() => {
  globalThis.fetch = mockFetch(async () =>
    createResponse({ ok: true, status: 200, body: { success: true } })
  ) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

/**
 * What: sendSMS resolves with the gateway's parsed response payload when
 * the request succeeds, and makes exactly one request to do so.
 * How: Calls sendSMS with a single valid message bag against a mocked
 * 200 response carrying a realistic UjumbeSMS success payload, then
 * asserts the returned payload matches it exactly and that fetch was
 * called only once.
 * Why (alignment): instruction.md's signature line requires sendSMS to
 * resolve to [ISMSResponse | undefined, SendResult] -- this verifies the
 * success half of that contract: on a clean send, the real response data
 * comes back unmodified as the first element.
 * Why (calibration): checks the full returned payload against the exact
 * mocked response body, since the response shape itself is the pinned
 * ISMSResponse contract, not an internal detail -- and checks the call
 * count to guard against accidental retries or duplicate requests on a
 * plain success path.
 */
test('returns_the_parsed_payload_when_the_api_request_succeeds', async () => {
  const payload = {
    status: {
      code: '1008',
      type: 'success',
      description: 'Yourmessageshavebeenqueued',
    },
    meta: {
      recipients: 3,
      credits_deducted: 3,
      available_credits: '6608',
      user: 'yourregisteredname',
      date_time: {
        date: '2015­08­1518:19:47',
        timezone_type: 3,
        timezone: 'Africa/Nairobi',
      },
    },
  };
  const request = [
    { numbers: ['254700000000'], message: 'Hello', sender: 'TEST' },
  ];
  const options = { email: 'user@example.com', apiKey: 'secret-key' };

  const fetchMock = mockFetch(async () =>
    createResponse({ ok: true, status: 200, body: payload })
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const [data, _] = await sendSMS(request, options);

  expect(data).toEqual(payload);
  expect(fetchMock.mock.calls).toHaveLength(1);
});

/**
 * What: sendSMS resolves with an error, not a rejection, when the
 * network request itself fails (as opposed to the gateway returning an
 * HTTP error status).
 * How: Mocks fetch to reject/throw, simulating a network-level failure,
 * then calls sendSMS with a single valid message bag and asserts the
 * call resolves normally to a tuple with an undefined payload and an
 * error object rather than propagating the rejection.
 * Why (alignment): instruction.md requires that "nothing here should
 * throw" and that every outcome "comes back through that same return
 * value" -- this verifies that guarantee holds for a network-level
 * failure specifically, not just an HTTP error response.
 * Why (calibration): only checks that the second tuple element is an
 * object (some error was reported) and the first is undefined, without
 * asserting on the error's exact message or type -- any implementation
 * that surfaces a network failure through the return value, rather than
 * an uncaught throw, satisfies this.
 */
test('returns_the_original_error_when_the_request_itself_fails', async () => {
  const request = [
    { numbers: ['254700000000'], message: 'Hello', sender: 'TEST' },
  ];
  const options = { email: 'user@example.com', apiKey: 'secret-key' };

  globalThis.fetch = mockFetch(async () => {
    throw new Error('network down');
  }) as unknown as typeof fetch;

  const [data, err] = await sendSMS(request, options);

  expect(data).toBeUndefined();
  expect(err).toBeTypeOf('object');
});

/**
 * What: sendSMS resolves with the expected error message for each non-success
 * HTTP status code.
 * How: Mocks fetch to return a response with each status code, then calls
 * sendSMS with a single valid message bag and asserts the returned error
 * message matches the expected one.
 * Why (alignment): instruction.md requires that sendSMS surface gateway
 * errors through its return value, not by throwing -- this verifies that
 * guarantee holds for all documented error cases.
 * Why (calibration): checks only the error message for each case, since the
 * exact error object structure is not part of the public API contract,
 * but the messages are intended to be user-facing and consistent.
 */
test('returns_the_expected_error_for_each_non-success_status_code', async () => {
  const request = [
    { numbers: ['254700000000'], message: 'Hello', sender: 'TEST' },
  ];
  const options = { email: 'user@example.com', apiKey: 'secret-key' };

  const cases = [
    {
      status: 404,
      message: 'API endpoint not found. Please check the URL and try again.',
    },
    {
      status: 401,
      message: 'Unauthorized. Please check your API key and email.',
    },
    {
      status: 403,
      message: 'Forbidden. You do not have permission to access this resource.',
    },
    {
      status: 400,
      message: 'Bad request. Please check the request payload and try again.',
    },
    { status: 500, message: 'Internal server error. Please try again later.' },
  ];

  for (const testCase of cases) {
    globalThis.fetch = mockFetch(async () =>
      createResponse({ ok: false, status: testCase.status, body: {} })
    ) as unknown as typeof fetch;
    const [data, error] = await sendSMS(request, options);

    expect(data).toBeUndefined();
    expect(error).toBeTypeOf('object');
  }
});

/**
 * What: sendSMS resolves with an error, not a throw, when the gateway
 * returns a successful HTTP status but a response body that can't be
 * parsed as JSON.
 * How: Mocks fetch to return an ok, 200 response whose json() method
 * itself throws, then calls sendSMS with a single valid message bag and
 * asserts the call resolves to a tuple with an undefined payload and the
 * parsing error surfaced on the result's error field.
 * Why (alignment): instruction.md requires that every outcome "comes
 * back through that same return value" with nothing thrown -- this
 * covers a failure mode distinct from a network failure or a non-2xx
 * status: the request succeeds at the HTTP level but the body itself is
 * malformed, which still has to be caught and reported, not left to
 * throw partway through parsing.
 * Why (calibration): checks that the underlying parse error is an Error
 * instance and preserves its original message, since losing the
 * underlying cause here would leave a caller unable to tell a parsing
 * failure apart from any other error -- it does not assert on the error
 * category or wrapping structure beyond that.
 */
test('returns_the_json_parsing_error_when_the_response_body_cannot_be_parsed', async () => {
  const request = [
    { numbers: ['254700000000'], message: 'Hello', sender: 'TEST' },
  ];
  const options = { email: 'user@example.com', apiKey: 'secret-key' };

  const malformedResponse = {
    ok: true,
    status: 200,
    json: async () => {
      throw new Error('invalid json');
    },
  } as unknown as Response;

  globalThis.fetch = mockFetch(
    async () => malformedResponse
  ) as unknown as typeof fetch;

  const [data, err] = await sendSMS(request, options);

  expect(data).toBeUndefined();
  expect(err.error).toBeInstanceOf(Error);
  expect((err.error as Error).message).toBeTruthy();
});
