# Snag — Webhook Inspector & Visual Router

Snag is an open-source webhook inspector and forwarder with a real-time console, replay support, forwarding rules, a CLI tunnel, and MCP tooling.

## Quickstart

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.11+ and `uv` (for `packages/mcp`)
- Postgres + Redis for full server functionality

### Install

```bash
pnpm install
```

### Run apps

```bash
pnpm --filter @snag/server dev
pnpm --filter @snag/web dev
```

Server defaults to `http://localhost:8080`; web defaults to `http://localhost:3000`.

## Monorepo packages

- `apps/server` — Fastify capture API + WebSocket hub
- `apps/web` — Next.js App Router console
- `packages/cli` — terminal CLI and tunnel workflow
- `packages/sdk` — TypeScript SDK (`@snag/sdk`)
- `packages/mcp` — Python MCP server (`snag-mcp`)
- `packages/db` + `packages/shared` — internal schema/types

## Deployment overview

- **Web**: deploy via Vercel GitHub integration
- **Server**: deploy to Fly.io using `.github/workflows/deploy.yml`
- **Packages**: publish on `v*` tags via `.github/workflows/publish.yml`

## Security defaults included

- Capture endpoint rate limiting defaults to **100 requests/min/token**
- Request body limit defaults to **1 MB**, with explicit `413 Payload too large` responses

## Self-hosting

See [`docs/self-hosting.md`](docs/self-hosting.md) for Docker Compose instructions and required environment variables.
