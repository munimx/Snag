# TypeScript SDK Guide

`@snag/sdk` is the programmatic client for Snag. Use it when a test suite,
integration harness, internal tool, or browser app needs to create endpoints,
watch requests, replay traffic, or turn captured payloads into cURL commands.

## Install

```bash
pnpm add @snag/sdk
```

For Node scripts that use live WebSocket subscriptions, also provide a
WebSocket implementation:

```bash
pnpm add ws
```

## Create an Endpoint

```ts
import { SnagClient } from '@snag/sdk';

const client = new SnagClient({
  baseUrl: process.env.SNAG_SERVER_URL ?? 'http://localhost:8080',
});

const endpoint = await client.createEndpoint({ label: 'stripe-dev' });

console.log(endpoint.token);
console.log(endpoint.url);
```

`createEndpoint` calls `POST /api/endpoints` when the server is reachable. If
that API is unavailable, the SDK falls back to a generated local token so tests
can still build endpoint helpers.

## Use a Known Token

```ts
import { SnagClient } from '@snag/sdk';

const client = new SnagClient({
  baseUrl: 'http://localhost:8080',
});

const endpoint = client.getEndpoint('stripe-dev');
console.log(endpoint.url);
```

## List Captured Requests

```ts
const result = await endpoint.listRequests({
  limit: 25,
  method: 'POST',
  search: 'checkout.session.completed',
});

for (const request of result.data) {
  console.log(request.id, request.method, request.path, request.receivedAt);
}

if (result.meta.hasMore) {
  console.log('Next cursor:', result.meta.nextCursor);
}
```

Supported filters match the REST API: `limit`, `cursor`, `method`, and
`search`.

## Wait for the Next Request

Without options, `waitForRequest` uses the server long-poll endpoint:

```ts
const request = await endpoint.waitForRequest();

if (request) {
  console.log(request.id, request.body);
}
```

With a timeout, it opens a WebSocket subscription and resolves with `null` if no
request arrives in time:

```ts
const request = await endpoint.waitForRequest({ timeout: 30_000 });
```

## Subscribe to Live Requests

Browser runtimes can use the global `WebSocket`. Node scripts should provide a
factory:

```ts
import { SnagClient } from '@snag/sdk';
import type { SnagWebSocketLike } from '@snag/sdk/types';
import WebSocket from 'ws';

const client = new SnagClient({
  baseUrl: 'http://localhost:8080',
  websocketFactory: (url) => new WebSocket(url) as unknown as SnagWebSocketLike,
});

const endpoint = client.getEndpoint('github-dev');

const unsubscribe = endpoint.onRequest((request) => {
  console.log(request.id, request.headers['content-type']);
});

process.once('SIGINT', () => {
  unsubscribe();
});
```

## Replay a Captured Request

```ts
const { data } = await endpoint.listRequests({ limit: 1 });
const latest = data[0];

if (latest) {
  const replay = await latest.replay('http://localhost:3000/webhooks/stripe');
  console.log(replay.responseStatus, replay.latencyMs);
}
```

Replay is best for debugging handler behavior. Some providers include
timestamped signatures, so a replayed request can fail signature verification
even when the captured payload is valid.

## Generate cURL

```ts
const command = latest.toCurl('http://localhost:8080');
console.log(command);
```

Use this when filing issues, sharing repros, or turning a real provider payload
into a repeatable local test.

## Local Docker Flow

```bash
docker compose up --build
```

Then point the SDK at the local API:

```ts
const client = new SnagClient({ baseUrl: 'http://localhost:8080' });
```

For WebSocket calls, the SDK derives `ws://localhost:8080/ws` from `baseUrl`
unless `wsUrl` is supplied explicitly.
