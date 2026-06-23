# @snag/sdk

TypeScript client for Snag webhook inspection. Use it to create capture URLs,
wait for real provider webhooks, subscribe to live request events, replay stored
payloads, and turn captured traffic into cURL repros.

## Install

This package is prepared for npm publication as `@snag/sdk`. Publication is
pending `@snag` scope access. Once that scope is available:

```bash
pnpm add @snag/sdk
```

Node scripts that use live WebSocket subscriptions also need a WebSocket
implementation:

```bash
pnpm add ws
```

## Hosted Quickstart

```ts
import { SnagClient } from '@snag/sdk';

const client = new SnagClient();
const endpoint = await client.createEndpoint({ label: 'stripe-dev' });

console.log(endpoint.url);

const request = await endpoint.waitForRequest({ timeout: 30_000 });
console.log(request?.id, request?.body);
```

The default server is `https://snag-server.fly.dev`. For local or self-hosted
Snag, pass `baseUrl`:

```ts
const client = new SnagClient({ baseUrl: 'http://localhost:8080' });
```

Full guide: https://github.com/munimx/Snag/blob/main/docs/sdk-guide.md
