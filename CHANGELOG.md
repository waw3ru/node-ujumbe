# Changelog

## Unreleased - PRs #3-#12

This release continues the migration to a typed, modular SMS client and improves the development and testing workflow. It includes the original Bun/API refactor, the SMS request and validation implementation, TypeScript declaration updates, and the Vitest test-runner migration.

### Added

- Migrated the project to Bun for development, testing, formatting, linting, and build workflows.
- Added a TypeScript-first implementation with explicit request and response interfaces.
- Added a modern package build pipeline with ESM, CommonJS, and declaration output.
- Added automated tests covering successful requests, network failures, non-success HTTP statuses, malformed JSON responses, phone-number validation, utility helpers, and large batches.
- Added ESLint configuration and TypeScript compiler settings for consistent static checks.
- Added generated TypeScript declarations for the public API, request types, response types, and utility functions.
- Added Vitest as the test runner and migrated the test suite from Bun's test runner.

### Changed

- Replaced the old Axios-based client with native `fetch` requests to the Ujumbe SMS gateway.
- Replaced the previous class-based API with a simpler functional API.
- The public entry point now exposes `sendSMS` rather than the older `Api` and `SMS` classes.
- The request payload shape is now more explicit and array-based:
  - each item is a message bag with `numbers`, `message`, and `sender`
  - `numbers` is now an array of strings instead of a comma-separated string
- Error handling now returns a tuple in the form `[data, error]` instead of relying on the previous promise/response model.
- The response contract is now based on a typed `ISMSResponse` object with `status` and `meta` fields, rather than the older `apiResponse`, `resStatus`, and `resRaw` structure.
- SMS request handling is split into focused modules for API requests, async helpers, constants, and phone-number validation.
- Phone numbers are normalized to E.164 format when valid, while invalid numbers are returned separately and valid numbers in the same batch continue to be processed.
- Test assertions and mocks now use Vitest equivalents, including `vi.fn` and Vitest-supported matchers.
- Dependencies and test coverage were updated, and generated distribution output is ignored by Git.

### Test coverage

- Consolidated the validation scenarios into `test/index.spec.ts` and exercised them through the public `sendSMS` entrypoint.
- Added coverage for large recipient batches, multiple message bags, duplicate invalid-number reporting, invalid-only bags being dropped while valid bags are sent, empty input, and missing or empty message-bag fields.
- Added exact request-contract assertions for the gateway URL, HTTP method, credentials, content type, nested message-bag payload, and comma-separated recipients.
- Calibrated failure tests to verify error categories and preserved error causes without coupling behavior tests to changeable error-message wording.

### Fixed

- Preserved the underlying JSON parsing error when a successful gateway response cannot be decoded.
- Updated error assertions to verify returned error values without depending on Bun-only matchers.

### New API example

Before:

```ts
import { Api, SMS } from 'ujumbesms';

const api = new Api({ email, apiKey });
await api.queue(new SMS(['254700000000'], 'Hello', 'TEST'));
```

Now:

```ts
import { sendSMS } from 'ujumbesms';

const [data, error] = await sendSMS([{ numbers: ['254700000000'], message: 'Hello', sender: 'TEST' }], { email, apiKey });
```

### Breaking changes

- Existing code that imports `Api` or `SMS` from the package root will need to be updated.
- Any code that depends on the old `queue()` method or `SMS.serialize()` behavior must be rewritten to use `sendSMS`.
- Code that expects Axios-style responses or the old response object shape will need to be adjusted.
- Phone number validation and normalization are now handled by the library. Valid numbers are normalized before sending, and invalid numbers are reported in the result.
- Consumers using Node should use a runtime with support for global `fetch` (for example, Node 18+), or a compatible polyfill/runtime.
