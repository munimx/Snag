# snag-cli

`snag-cli` is the terminal client for Snag. It lets you watch captured requests, inspect a request by ID, replay requests to another target, and authenticate with magic links.

`listen` is the real-time capture stream. Use `replay` when you want to forward a captured request to a specific destination.

## Install

```bash
npm install -g snag-cli
# or run without installing
npx snag-cli --help
```

Then run:

```bash
snag --help
```

## Requirements

1. Node.js 20+
2. A reachable Snag server (local or hosted)

By default the CLI uses the hosted API at `https://snag-server.fly.dev`.
Override with `--server <url>` or set `SNAG_SERVER_URL` when running a local or
self-hosted server.

## Quick start

1. Start the CLI listener:

```bash
snag listen 3000
```

2. Send a webhook to the printed public URL (`.../h/<token>`).
3. Copy the `requestId` from output and inspect it:

```bash
snag inspect <requestId>
```

4. Replay it to another target:

```bash
snag replay <requestId> --target https://httpbin.org/post
```

## Commands

### `snag listen <port>`

Listen for real-time captured requests for a token.

Options:

- `-t, --token <token>` reuse a specific endpoint token
- `-s, --server <url>` server base URL
- `--method <method>` filter method in terminal UI mode
- `--search <text>` filter path/body in terminal UI mode
- `--json` print machine-readable JSON lines
- `--silent` suppress output

Example:

```bash
snag listen 3000 --token my-dev-token --json
```

### `snag inspect <requestId>`

Fetch and print one captured request by ID.

Options:

- `-s, --server <url>`
- `--json`
- `--silent`

Example:

```bash
snag inspect req_abc123 --json
```

### `snag replay <requestId> --target <url>`

Replay a captured request to a target URL.

Options:

- `--target <url>` (required)
- `-s, --server <url>`
- `--json`
- `--silent`

Example:

```bash
snag replay req_abc123 --target https://httpbin.org/post --json
```

### `snag login --email <email>`

Starts the magic-link login flow. The CLI requests a magic link, extracts the token, verifies it, and saves the session token locally.

Options:

- `-e, --email <email>` (required)
- `-s, --server <url>`
- `--token <magicToken>` verify directly with a known magic token

Example:

```bash
snag login --email dev@example.com
```

## Output modes

- Default: human-readable terminal output
- `--json`: machine-readable output for scripts
- `--silent`: no output (useful in automation)

## Local config

The CLI stores state in:

```text
~/.snag/config.json
```

Fields:

- `token`: default endpoint token
- `serverUrl`: default server URL
- `authToken`: session token from `snag login`

## Troubleshooting

- `HTTP 401` on authenticated operations: run `snag login` first.
- `HTTP 404` for inspect/replay: confirm the request ID exists and is accessible.
- Connection errors: verify `--server` or `SNAG_SERVER_URL` points to a live
  Snag server.

## npm README behavior

This `README.md` is in the package root (`packages/cli`), which is required for npm package pages.

README changes appear on npm only after publishing a new package version.
