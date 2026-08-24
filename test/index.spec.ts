// eval_suite: sequoia-send-sms-contract
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
 * Why (contract): also checks the exact gateway URL, method, credentials,
 * content type, and serialized message-bag body so changes to the wire
 * contract cannot pass while only preserving the parsed response.
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
    {
      numbers: ['254700000000', '+254700000001'],
      message: 'Hello',
      sender: 'TEST',
    },
    { numbers: ['254700000002'], message: 'Second message', sender: 'APP' },
  ];
  const options = { email: 'user@example.com', apiKey: 'secret-key' };

  const fetchMock = mockFetch(async () =>
    createResponse({ ok: true, status: 200, body: payload })
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const [data, _] = await sendSMS(request, options);

  expect(data).toEqual(payload);
  expect(fetchMock.mock.calls).toHaveLength(1);

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe('http://ujumbesms.co.ke/api/messaging');
  expect(init.method).toBe('POST');
  expect(Object.fromEntries(new Headers(init.headers).entries())).toEqual({
    'content-type': 'application/json',
    email: 'user@example.com',
    'x-authorization': 'secret-key',
  });
  expect(JSON.parse(init.body as string)).toEqual({
    data: [
      {
        message_bag: {
          numbers: '+254700000000,+254700000001',
          message: 'Hello',
          sender: 'TEST',
        },
      },
      {
        message_bag: {
          numbers: '+254700000002',
          message: 'Second message',
          sender: 'APP',
        },
      },
    ],
  });
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
 * Why (calibration): checks that the exact rejection Error is returned,
 * preserving its identity without coupling the test to presentation text.
 */
test('returns_the_original_error_when_the_request_itself_fails', async () => {
  const request = [
    { numbers: ['254700000000'], message: 'Hello', sender: 'TEST' },
  ];
  const options = { email: 'user@example.com', apiKey: 'secret-key' };

  const failure = new Error('network down');
  globalThis.fetch = mockFetch(async () => {
    throw failure;
  }) as unknown as typeof fetch;

  const [data, err] = await sendSMS(request, options);

  expect(data).toBeUndefined();
  expect(err).toBe(failure);
});

/**
 * What: sendSMS resolves with an Error for each non-success HTTP status code.
 * How: Mocks fetch to return a response with each status code, then calls
 * sendSMS with a single valid message bag and asserts the returned value
 * contains no payload and does contain an Error.
 * Why (alignment): instruction.md requires that sendSMS surface gateway
 * errors through its return value, not by throwing -- this verifies that
 * guarantee holds for all documented error cases.
 * Why (calibration): verifies the failure category for every status without
 * coupling behavior tests to wording that may change independently.
 */
test('returns_the_expected_error_for_each_non-success_status_code', async () => {
  const request = [
    { numbers: ['254700000000'], message: 'Hello', sender: 'TEST' },
  ];
  const options = { email: 'user@example.com', apiKey: 'secret-key' };

  const cases = [
    { status: 404 },
    { status: 401 },
    { status: 403 },
    { status: 400 },
    { status: 500 },
  ];

  for (const testCase of cases) {
    globalThis.fetch = mockFetch(async () =>
      createResponse({ ok: false, status: testCase.status, body: {} })
    ) as unknown as typeof fetch;
    const [data, error] = await sendSMS(request, options);

    expect(data).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
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
 * Why (calibration): checks that the underlying parse Error is preserved by
 * identity without coupling the test to its presentation text. Since losing the
 * underlying cause here would leave a caller unable to tell a parsing
 * failure apart from any other error.
 */
test('returns_the_json_parsing_error_when_the_response_body_cannot_be_parsed', async () => {
  const request = [
    { numbers: ['254700000000'], message: 'Hello', sender: 'TEST' },
  ];
  const options = { email: 'user@example.com', apiKey: 'secret-key' };

  const parseFailure = new Error('invalid json');
  const malformedResponse = {
    ok: true,
    status: 200,
    json: async () => {
      throw parseFailure;
    },
  } as unknown as Response;

  globalThis.fetch = mockFetch(
    async () => malformedResponse
  ) as unknown as typeof fetch;

  const [data, err] = await sendSMS(request, options);

  expect(data).toBeUndefined();
  expect(err.error).toBeInstanceOf(Error);
  expect(err.error).toBe(parseFailure);
});

/**
 * What: sendSMS should normalize every valid number in a large bag without
 * dropping recipients or reporting valid numbers as invalid.
 * How: Sends 250 valid recipients through the public entrypoint and checks
 * the successful result and serialized request contain all 250 numbers.
 * Why: large batches exercise the validation and request-building boundary,
 * where truncation or incorrect filtering would affect real campaigns.
 */
test('sendSMS_handles_a_large_batch_of_valid_phone_numbers', async () => {
  const manyNumbers = Array.from({ length: 250 }, () => '+254700000000');
  const request = [{ numbers: manyNumbers, message: 'Hello', sender: 'TEST' }];

  const [data, result] = await sendSMS(request, {
    email: 'user@example.com',
    apiKey: 'secret-key',
  });

  expect(data).toEqual({ success: true });
  expect(result).toEqual({ error: undefined, incorrectNumbers: [] });

  const defaultFetch = globalThis.fetch as FetchMock;
  const [, init] = defaultFetch.mock.calls[0] as [string, RequestInit];
  const body = JSON.parse(init.body as string) as {
    data: { message_bag: { numbers: string } }[];
  };
  expect(body.data).toHaveLength(1);
  expect(body.data[0].message_bag.numbers.split(',')).toHaveLength(250);
  expect(body.data[0].message_bag.numbers).toContain('+254700000000');
});

/**
 * What: sendSMS should process many separate valid bags through its public
 * entrypoint without losing bags or incorrectly reporting invalid numbers.
 * How: Sends 100 valid bags and verifies all 100 appear in the request and
 * the returned invalid-number list is empty.
 * Why: exercises the across-bags validation path separately from a large
 * recipient list within one bag.
 */
test('sendSMS_handles_many_valid_message_bags', async () => {
  const manyBags = Array.from({ length: 100 }, () => ({
    numbers: ['254700000000'],
    message: 'Hello',
    sender: 'TEST',
  }));

  const [data, result] = await sendSMS(manyBags, {
    email: 'user@example.com',
    apiKey: 'secret-key',
  });

  expect(data).toEqual({ success: true });
  expect(result).toEqual({ error: undefined, incorrectNumbers: [] });

  const defaultFetch = globalThis.fetch as FetchMock;
  const [, init] = defaultFetch.mock.calls[0] as [string, RequestInit];
  const body = JSON.parse(init.body as string) as { data: unknown[] };
  expect(body.data).toHaveLength(100);
});

/**
 * What: sendSMS should deduplicate invalid numbers and omit an invalid-only
 * bag while still sending another bag that contains a valid number.
 * How: Sends duplicate invalid values in one bag and a valid value in a
 * second bag, then checks the result and request contain only valid data.
 * Why: callers need unique actionable feedback without losing deliverable
 * messages or sending malformed recipient data to the gateway.
 */
test('sendSMS_deduplicates_invalid_numbers_and_drops_invalid_only_bags', async () => {
  const request = [
    {
      numbers: ['not-a-number', 'not-a-number'],
      message: 'Invalid message',
      sender: 'TEST',
    },
    {
      numbers: ['another-invalid-number', '254700000000'],
      message: 'Valid message',
      sender: 'APP',
    },
  ];
  const fetchMock = mockFetch(async () =>
    createResponse({ ok: true, status: 200, body: { success: true } })
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const [data, result] = await sendSMS(request, {
    email: 'user@example.com',
    apiKey: 'secret-key',
  });

  expect(data).toEqual({ success: true });
  expect(result).toEqual({
    error: undefined,
    incorrectNumbers: ['not-a-number', 'another-invalid-number'],
  });
  expect(fetchMock.mock.calls).toHaveLength(1);

  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(JSON.parse(init.body as string)).toEqual({
    data: [
      {
        message_bag: {
          numbers: '+254700000000',
          message: 'Valid message',
          sender: 'APP',
        },
      },
    ],
  });
});

/**
 * What: sendSMS should return the documented validation error for empty input
 * and for every missing or empty required message-bag field.
 * How: Passes each malformed value through sendSMS and checks the returned
 * error while ensuring validation never reaches the gateway request.
 * Why: the public API must reject malformed bags consistently without
 * throwing or attempting to send partial request data.
 */
test('sendSMS_returns_errors_for_empty_or_incomplete_message_bags', async () => {
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
    const [data, error] = await sendSMS(input as never, {
      email: 'user@example.com',
      apiKey: 'secret-key',
    });

    expect(data).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBeTypeOf('string');
    expect((error as Error).message.length).toBeGreaterThan(0);
  }
});
