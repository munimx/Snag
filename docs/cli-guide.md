# CLI Guide

`snag-cli` is the terminal workflow for local webhook development. It can create
or reuse an endpoint token, print the public capture URL, stream captured
requests, inspect a request by id, replay a request, and authenticate with a
magic link.

## Install

```bash
npm install -g snag-cli
# or
npx snag-cli --help
```

For local development from this repository:

```bash
pnpm --filter snag-cli build
SNAG_SERVER_URL=http://localhost:8080 pnpm --filter snag-cli exec snag --help
```

## Hosted Quickstart

Start your local webhook handler on a port. For example, from your app
repository:

```bash
npm run dev -- --port 4242
```

In another terminal, listen with a stable token:

```bash
npx snag-cli listen 4242 --token stripe-dev
```

The CLI prints a hosted capture URL like:

```text
https://snag-server.fly.dev/h/stripe-dev
```

Use that URL in Stripe, GitHub, Clerk, Supabase, or a test `curl` command. The
terminal displays every captured request for the token and relays captured
traffic to `127.0.0.1:<port>`.

## Local Quickstart

Start Snag:

```bash
docker compose up --build
```

Listen against the local API explicitly:

```bash
SNAG_SERVER_URL=http://localhost:8080 snag listen 4242 --token stripe-dev
```

The CLI prints a URL like:

```text
http://localhost:8080/h/stripe-dev
```

Use that URL in Stripe, GitHub, Clerk, Supabase, or a test `curl` command. The
terminal displays every captured request for the token and relays captured
traffic to `127.0.0.1:<port>`. `snag listen` checks that your local handler is
already listening on that port before it opens the tunnel.

## Commands

### `snag listen <port>`

```bash
snag listen 4242 --token stripe-dev
```

Useful options:

- `--token <token>` reuses a deterministic endpoint token
- `--server <url>` overrides the Snag API origin
- `--method <method>` filters the terminal list
- `--search <text>` filters the terminal list by path/body text
- `--json` emits captured requests as JSON lines
- `--silent` suppresses output for automation

JSON mode is handy for scripts:

```bash
snag listen 4242 --token ci-webhooks --json \
  | jq -r '.id + " " + .method + " " + .path'
```

### `snag inspect <requestId>`

```bash
snag inspect req_abc123
```

Use `--json` when piping the captured request into another tool:

```bash
snag inspect req_abc123 --json | jq '.headers, .body'
```

### `snag replay <requestId> --target <url>`

```bash
snag replay req_abc123 \
  --target http://localhost:4242/webhooks/stripe
```

Replay sends the stored method, headers, and body to the target URL. Snag strips
protected hop/auth headers on server-side replay, so use provider resend tools
when you need to validate exact signature behavior.

### `snag login --email <email>`

```bash
snag login --email dev@example.com
```

The CLI stores the resulting session token in `~/.snag/config.json`.

## Configuration

Resolution order for the server URL:

1. `--server <url>`
2. `~/.snag/config.json`
3. `SNAG_SERVER_URL`
4. `https://snag-server.fly.dev`

For local development, pass `--server http://localhost:8080` or set
`SNAG_SERVER_URL=http://localhost:8080`.

The config file can store:

- `serverUrl`: default server URL
- `token`: default endpoint token
- `authToken`: session token from `snag login`

## Provider Workflow

1. Pick a stable token, for example `github-dev`.
2. Run `snag listen <local-port> --token github-dev`.
3. Paste the printed `/h/github-dev` URL into the provider dashboard.
4. Trigger a test event from the provider.
5. Use `snag inspect <requestId>` to inspect headers and body.
6. Use `snag replay <requestId> --target <local-url>` for repeatable handler
   debugging.

## Troubleshooting

- `Connection refused`: confirm the Snag server is running and `--server`
  points at the API, not the web app. Installed CLI commands default to
  `https://snag-server.fly.dev`; local stacks must opt into
  `http://localhost:8080`.
- `No service is listening on localhost:<port>`: start your local webhook
  handler first, then rerun `snag listen`.
- `HTTP 404` from `inspect` or `replay`: confirm the request id came from the
  same server and has not been deleted.
- No terminal updates: confirm the provider is posting to the exact printed
  `/h/<token>` URL.
- Signature failures during replay: use the provider resend button for final
  signature tests. Stripe and Clerk signatures can expire because they include
  timestamps.
