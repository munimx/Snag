# Reliability and Operations

This page tracks the reliability posture for the hosted Snag product and the
self-hosted stack.

## Current Safeguards

- **Liveness:** `GET /health` returns `{ "ok": true }` for Fly.io and uptime
  probes.
- **Request size limit:** `BODY_LIMIT_BYTES` defaults to `1048576` bytes. Large
  captures return `413 Payload too large`.
- **Capture rate limit:** `/h/:token` is rate-limited per endpoint token by
  `RATE_LIMIT_MAX_PER_MINUTE`, defaulting to `100` requests per minute.
- **Auth rate limits:** magic-link issue and verify routes are IP-limited.
- **Forwarding retries:** background delivery uses retry attempts and
  exponential backoff when `ENABLE_DELIVERY_WORKER=true`.
- **Structured logs:** capture, WebSocket, replay, and delivery paths log
  request ids and endpoint context through Fastify/pino.
- **Guest history window:** unauthenticated request listing is limited to recent
  history so public endpoints stay useful without exposing long-lived feeds.

## Hosted Endpoints

| Surface | URL |
| --- | --- |
| Web | `https://snag-web-five.vercel.app` |
| API health | `https://snag-server.fly.dev/health` |
| Capture | `https://snag-server.fly.dev/h/:token` |
| WebSocket | `wss://snag-server.fly.dev/ws` |

## Recommended Uptime Checks

Use two external checks:

```bash
curl -fsS https://snag-server.fly.dev/health
curl -fsS https://snag-web-five.vercel.app
```

For deeper smoke coverage, create a temporary endpoint, post a small JSON body,
and list the latest requests for that token.

## Retention Policy

Current behavior:

- Guest endpoints created through the API receive an expiry timestamp.
- Authenticated endpoints are persistent until deleted.
- Public capture-created endpoints are intentionally allowed so provider
  dashboards can post without a prior API call.

Planned hardening:

- Scheduled cleanup for expired guest endpoints and old anonymous requests.
- Cleanup for expired magic links, sessions, replays, deliveries, and orphaned
  request rows.
- A documented hosted-cloud retention window once production usage grows.

## Known Gaps

- `/health` is cheap liveness only; it does not check Firestore, Redis, queue
  depth, or release metadata.
- Fly does not yet have explicit HTTP health checks in `fly.toml`.
- Replay records network failures as a completed replay with null response
  fields instead of a first-class error field.
- Non-capture REST routes should get route-specific limits before public launch
  traffic increases.
- Firestore list/count paths need indexed query optimization for larger
  histories.
- Metrics are not yet exported as Prometheus/OpenTelemetry counters.

## Next Reliability Milestones

1. Add `GET /health/ready` with Firestore and optional Redis checks.
2. Add a scheduled GitHub Actions smoke workflow for Fly and Vercel.
3. Add route limits for anonymous endpoint creation, replay, rules writes, and
   long-poll waits.
4. Add replay timeout/error fields and expose them in CLI, SDK, MCP, and web UI.
5. Add retention cleanup jobs and document hosted retention windows.
6. Add operational counters for captures, replays, WebSocket clients, delivery
   attempts, queue depth, and error rates.
