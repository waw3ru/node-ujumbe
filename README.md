# UjumbeSMS

[![CI](https://github.com/waw3ru/node-ujumbe/actions/workflows/main.yml/badge.svg)](https://github.com/waw3ru/node-ujumbe/actions/workflows/main.yml)

UjumbeSMS is a TypeScript client for sending SMS through the UjumbeSMS gateway. It provides a functional `sendSMS` API, validates and normalizes phone numbers, supports ESM and CommonJS consumers, and includes generated TypeScript declarations.

## Installation

Install the package and its dependencies with Bun:

```bash
bun add ujumbesms
```

The package requires an UjumbeSMS account and API credentials: an email address and API key.

## Usage

```ts
import { sendSMS } from 'ujumbesms';

const [data, result] = await sendSMS(
  [
    {
      numbers: ['254700000000'],
      message: 'Hello from UjumbeSMS',
      sender: 'TEST',
    },
  ],
  {
    email: 'you@example.com',
    apiKey: 'your-api-key',
  }
);

if (data) {
  console.log('SMS queued:', data);
} else {
  console.error('SMS failed:', result);
}
```

`sendSMS` returns a `[data, result]` tuple. Valid phone numbers are normalized to E.164 format before the request. Invalid numbers are reported in `result.incorrectNumbers` when the request can still be processed.

## Development

### Prerequisites

- [Bun](https://bun.com) 1.3 or newer
- Git

### Install dependencies

```bash
bun install
```

### Build

Build the ESM, CommonJS, and TypeScript declaration outputs:

```bash
bun run build
```

The generated files are written to `dist/`.

### Test

Run the Vitest test suite:

```bash
bun run test
```

Run the complete local check, including formatting, linting, tests, and builds:

```bash
bun run ci:check
```

## Contributing

Please read the [contributing guide](CONTRIBUTING.md) before opening an issue or pull request.

## Changelog

See the [changelog](CHANGELOG.md) for the project history and release notes.

## License

UjumbeSMS is released under the [MIT License](LICENSE.md).

## Author

UjumbeSMS is authored by [John Waweru](mailto:waweruj00@gmail.com).

The project also includes contributions from UjumbeSMS and Patrick Maina.
