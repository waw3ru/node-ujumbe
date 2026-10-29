# Contributing to UjumbeSMS

Thank you for contributing to UjumbeSMS. This repository contains the TypeScript client library for sending SMS through the UjumbeSMS gateway. Contributions should keep the public API predictable, preserve the library's error-handling contract, and include focused tests for behavior changes.

## Before You Start

Please check the existing issues and pull requests before opening a new one. For significant changes, open an issue first so the proposed API, behavior, and compatibility impact can be discussed.

When reporting a bug, include:

- A concise description of the observed and expected behavior.
- The smallest input or code sample that reproduces the problem.
- The Vitest, operating system, and package version involved.
- Relevant error messages or test output.

Do not include API keys, email credentials, phone numbers belonging to real people, or other private data in issues, pull requests, tests, or logs. Report security vulnerabilities privately to the maintainers rather than opening a public issue.

## Prerequisites

- [Bun](https://bun.com) 1.3 or newer. The repository was initialized with Bun 1.3.14.
- Git.
- A working TypeScript development environment. Dependencies are installed from `package.json`.

This project uses Bun for package installation, scripts, and bundling, and Vitest for testing. Use the repository's Bun commands for project scripts and Vitest for the test runner.

## Local Setup

Clone the repository and install its dependencies:

```bash
git clone https://github.com/waw3ru/node-ujumbe.git
cd node-ujumbe-v2
bun install
```

Run the complete local verification suite:

```bash
bun run ci:check
```

The command runs formatting verification, ESLint, the Vitest suite, and all build targets. Run the individual checks while iterating:

```bash
bun run format:check  # Check Prettier formatting
bun run lint          # Check src/ and test/ TypeScript files
bun run test          # Run all tests with Vitest
bun run build         # Build ESM, CommonJS, and declaration output
```

The `format` script writes formatting changes across the repository. Review the resulting diff before committing:

```bash
bun run format
```

## Repository Layout

```text
src/index.ts       Public SMS sending API
src/@types.ts      Public request and response interfaces
src/utils.ts       Validation and async helper functions
test/index.spec.ts API and fetch behavior tests
test/util.spec.ts Utility and validation tests
dist/              Generated package output; created by the build
```

Keep implementation code in `src/` and matching behavior tests in `test/`. Do not edit generated files in `dist/`; regenerate them with `bun run build` when needed.

## Development Guidelines

### Preserve the public contract

- `sendSMS` returns a `[data, error]` tuple. Expected validation, network, HTTP, and JSON parsing failures should be returned through that tuple rather than thrown to callers.
- Valid phone numbers are normalized before being sent. Invalid numbers are reported in the result while valid numbers in the same batch remain usable.
- Changes to `src/@types.ts`, exported functions, response shapes, or error messages can affect consumers. Explain compatibility changes in the pull request.
- Keep both ESM and CommonJS builds, along with generated declarations, working.

### Match the existing code style

- Use TypeScript and existing local helpers before introducing a new abstraction.
- Use single quotes, trailing commas where Prettier applies them, and sorted imports/exports as enforced by the repository tooling.
- Keep functions focused and avoid unrelated refactors in a feature or bug-fix pull request.
- Do not add secrets or environment-specific configuration to the repository.
- Add comments only when they explain a non-obvious decision. Prefer clear names and small functions.

### Handle gateway behavior carefully

The client sends requests to the UjumbeSMS messaging endpoint with the caller's email and API key. Tests must mock `globalThis.fetch`; they must not make real gateway requests. When changing request construction, verify the HTTP method, headers, serialized payload, and response handling.

## Tests

Add or update tests whenever behavior changes. Tests use Vitest:

```ts
import { expect, test } from 'vitest';

test('describes the behavior being protected', () => {
  expect(actualValue).toBe(expectedValue);
});
```

Good tests should:

- Describe observable behavior rather than implementation details.
- Cover the successful path and relevant failure or boundary cases.
- Use deterministic inputs and avoid real network calls.
- Assert the returned tuple, normalized values, invalid-number reporting, or request details that form part of the public behavior.
- Restore mocked globals after each test when they are changed.

Run a focused test file while developing:

```bash
bun run test -- test/index.spec.ts
bun run test -- test/validate.spec.ts
```

Before requesting review, run `bun run ci:check` and include any known limitations in the pull request description.

## Pull Requests

1. Create a focused branch from `master`, for example `fix/invalid-number-reporting` or `feat/batch-options`.
2. Make the smallest coherent change that addresses the issue.
3. Add tests and update documentation or types when the public behavior changes.
4. Run `bun run ci:check` locally.
5. Review the diff for accidental generated files, credentials, debug output, and unrelated formatting changes.
6. Open a pull request against `master`.

A pull request description should explain:

- What changed and why.
- How the change was tested.
- Any API, compatibility, performance, or gateway-behavior implications.
- Any follow-up work or known limitations.

Keep pull requests reviewable. Split unrelated fixes into separate pull requests, and respond to review feedback with either the requested change or a clear technical explanation of why the current behavior should remain.

## Commits

Use concise, imperative commit subjects, such as `Fix invalid phone number handling` or `Add retry helper tests`. Keep each commit focused where practical. Do not commit `dist/` output unless the repository's release process specifically requires it.

## Releases

This is a published package with ESM, CommonJS, and declaration entry points. Changes that affect consumers should include an appropriate entry in `CHANGELOG.md` when preparing a release. The package build runs automatically through `prepublishOnly`, but contributors should still verify it locally with:

```bash
bun run build
```

Thank you for helping keep UjumbeSMS reliable and easy to use.
