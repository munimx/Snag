# Webhook Recipes

These recipes show the shortest path from provider dashboard to local handler.
They assume Snag is running locally:

```bash
docker compose up --build
```

Use a stable token per provider so teammates and test fixtures can reuse URLs:

```bash
export SNAG_SERVER_URL=http://localhost:8080
export SNAG_TOKEN=stripe-dev
export SNAG_URL="$SNAG_SERVER_URL/h/$SNAG_TOKEN"
```

## Stripe

Start a Snag listener for your local Stripe handler:

```bash
snag listen 4242 --token stripe-dev --server "$SNAG_SERVER_URL"
```

In the Stripe Dashboard:

- Add an endpoint with URL `http://localhost:8080/h/stripe-dev` for local
  Docker, or your deployed Snag URL for shared development.
- Select focused events such as `checkout.session.completed`,
  `payment_intent.succeeded`, and `customer.subscription.updated`.
- Copy the endpoint signing secret into your local app environment.

Send a smoke-test payload:

```bash
curl -X POST "$SNAG_URL" \
  -H 'content-type: application/json' \
  --data '{"type":"checkout.session.completed","data":{"object":{"id":"cs_test_123"}}}'
```

Notes:

- Snag captures the raw body and `stripe-signature` header.
- Stripe signatures include timestamps. Use Stripe's resend/test-event tools
  for final signature verification; use Snag replay for handler logic.

## GitHub

Start a Snag listener for your local GitHub handler:

```bash
snag listen 3000 --token github-dev --server "$SNAG_SERVER_URL"
```

In GitHub repository settings:

- Set Payload URL to `http://localhost:8080/h/github-dev` or the deployed Snag
  capture URL.
- Set Content type to `application/json`.
- Set a webhook secret and store it in your local app.
- Start with `push` and `pull_request` events.

Inspect the latest event:

```bash
snag inspect req_abc123 --server "$SNAG_SERVER_URL" --json | jq '.headers, .body'
```

GitHub sends `x-hub-signature-256` when a secret is configured. Keep raw-body
verification in your handler.

## Clerk

Start a listener for your auth app:

```bash
snag listen 3001 --token clerk-dev --server "$SNAG_SERVER_URL"
```

In Clerk:

- Add an endpoint URL for `/h/clerk-dev`.
- Subscribe to events such as `user.created`, `user.updated`, and
  `session.created`.
- Copy the signing secret into your local app.

Clerk uses Svix-style headers such as `svix-id`, `svix-timestamp`, and
`svix-signature`. Like Stripe, timestamped signatures can expire, so provider
resend is the best final check for signature verification.

## Supabase

Supabase projects vary by feature, so use Snag as the capture URL for whichever
webhook mechanism you are testing, then validate the secret/header pattern your
project configured.

Common local setup:

```bash
snag listen 54321 --token supabase-dev --server "$SNAG_SERVER_URL"
```

In Supabase:

- Set the webhook URL to `/h/supabase-dev`.
- Limit events to the table or auth event you are debugging.
- Add a custom secret header such as `x-webhook-secret` if the Supabase feature
  lets you configure headers.

Then filter captured events:

```bash
snag listen 54321 \
  --token supabase-dev \
  --method POST \
  --search public.orders
```

## Forward Selected Events

Forwarding rules are useful when one provider sends many events but only a few
should reach a handler:

```bash
curl -X POST "$SNAG_SERVER_URL/api/endpoints/$SNAG_TOKEN/rules" \
  -H 'content-type: application/json' \
  --data '{
    "name": "Stripe checkout only",
    "filterMethod": "POST",
    "filterBodyKey": "type",
    "filterBodyVal": "checkout.session.completed",
    "destinationUrl": "http://host.docker.internal:4242/webhooks/stripe",
    "retries": 3
  }'
```

Use `ENABLE_DELIVERY_WORKER=true` and Redis when testing background forwarding
rules locally.

## Share a Repro

Turn any captured request into a repeatable command:

```ts
import { SnagClient } from '@snag/sdk';

const client = new SnagClient({ baseUrl: 'http://localhost:8080' });
const endpoint = client.getEndpoint('stripe-dev');
const { data } = await endpoint.listRequests({ limit: 1 });

console.log(data[0]?.toCurl('http://localhost:8080'));
```

Before sharing logs or cURL output, remove secrets from headers such as
`authorization`, `cookie`, provider signatures, and custom secret headers.

## Provider References

- [Stripe webhook docs](https://docs.stripe.com/webhooks)
- [GitHub webhook signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Clerk webhook overview](https://clerk.com/docs/guides/development/webhooks/overview)
- [Svix payload verification](https://docs.svix.com/receiving/verifying-payloads/how)
- [Supabase database webhooks](https://supabase.com/docs/guides/database/webhooks)
