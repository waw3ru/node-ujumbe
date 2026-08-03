# Changelog

## Unreleased - PR #1: Bun migration and API refactor

This release is a major rewrite of the package structure and public API. The goal was to modernize the codebase, move the project to Bun, and simplify integration for newer TypeScript and JavaScript environments.

### Added
- Migrated the project to Bun for development, testing, formatting, linting, and build workflows.
- Added a TypeScript-first implementation with explicit request and response interfaces.
- Added a modern package build pipeline with ESM, CommonJS, and declaration output.
- Added automated tests covering successful requests, network failures, non-success HTTP statuses, and malformed JSON responses.

### Changed
- Replaced the old Axios-based client with native `fetch` requests to the Ujumbe SMS gateway.
- Replaced the previous class-based API with a simpler functional API.
- The public entry point now exposes `sendSMS` rather than the older `Api` and `SMS` classes.
- The request payload shape is now more explicit and array-based:
  - each item is a message bag with `numbers`, `message`, and `sender`
  - `numbers` is now an array of strings instead of a comma-separated string
- Error handling now returns a tuple in the form `[data, error]` instead of relying on the previous promise/response model.
- The response contract is now based on a typed `ISMSResponse` object with `status` and `meta` fields, rather than the older `apiResponse`, `resStatus`, and `resRaw` structure.

### New API example

Before:

```ts
import { Api, SMS } from "ujumbesms";

const api = new Api({ email, apiKey });
await api.queue(new SMS(["254700000000"], "Hello", "TEST"));
```

Now:

```ts
import { sendSMS } from "ujumbesms";

const [data, error] = await sendSMS(
  [{ numbers: ["254700000000"], message: "Hello", sender: "TEST" }],
  { email, apiKey },
);
```

### Breaking changes
- Existing code that imports `Api` or `SMS` from the package root will need to be updated.
- Any code that depends on the old `queue()` method or `SMS.serialize()` behavior must be rewritten to use `sendSMS`.
- Code that expects Axios-style responses or the old response object shape will need to be adjusted.
- Phone number validation and normalization are no longer handled automatically by the library; invalid numbers are passed through as provided.
- Consumers using Node should use a runtime with support for global `fetch` (for example, Node 18+), or a compatible polyfill/runtime.
