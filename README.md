# Snag — Open-Source Webhook Inspector Platform

Snag is a multi-surface webhook platform: capture inbound HTTP traffic in real time, inspect and replay requests, route events with forwarding rules, expose local services through a CLI tunnel, and let AI agents operate the system through MCP tools.

## Product surfaces

| Surface | Package | Runtime | What it does |
| --- | --- | --- | --- |
| Web console | `apps/web` | Next.js 15 + React 19 | Live feed, history, replay UI, rule management, auth UX |
| Capture/API server | `apps/server` | Fastify + WebSocket | Capture endpoint, REST API, WS hub, replay execution, auth/session APIs |
| CLI tunnel | `packages/cli` (`snag-cli`) | Node.js | Terminal listener + WebSocket tunnel + inspect/replay/login commands |
| MCP server | `packages/mcp` (`snag-mcp`) | Python 3.11+ | Tool bridge for agent clients (Copilot, Claude Code, Cursor, etc.) |
| TypeScript SDK | `packages/sdk` (`@snag/sdk`) | Node + browser-friendly API | Programmatic endpoint management, request streaming, replay helpers |
| Shared contracts | `packages/shared` | TypeScript | Shared request types and WS message unions |
| DB package (internal) | `packages/db` | Prisma package | Internal schema/client artifacts kept in-repo |

## Component architecture

```text
External webhook sender
  -> /h/:token (apps/server)
  -> persisted request (Firestore)
  -> broadcast event (WebSocket hub)
      -> apps/web live console
      -> snag-cli listener
      -> @snag/sdk subscriptions
  -> replay/rules APIs
      -> web UI / CLI / MCP / SDK clients
```

## CLI screenshot

![Snag CLI terminal screenshot](docs/screenshots/cli-terminal.svg)

## MCP screenshot

![Snag MCP terminal screenshot](docs/screenshots/mcp-terminal.svg)

## Key backend capabilities

- Token-based webhook capture endpoint: `POST|GET|PUT|PATCH|DELETE /h/:token`
- Request APIs: list/get/delete/replay/wait
- Forwarding rule APIs: create/list/update/toggle/delete
- Auth APIs: magic-link issue/verify, session introspection, logout
- Real-time WS endpoint: `/ws`

## Runtime and storage

- **Primary persistence:** Firebase Firestore (via Admin SDK in `apps/server`)
- **Queue/cache:** Redis (`bullmq` + `ioredis`) for delivery worker flows
- **Security defaults:** request rate limiting, 1 MB body limit, protected replay headers

## Deployment model

| Target | Platform | Source |
| --- | --- | --- |
| Web console | Vercel | `apps/web` |
| API/WS server | Fly.io | `apps/server/fly.toml` + `.github/workflows/deploy.yml` |
| npm packages | npm registry | `.github/workflows/publish.yml` (`snag-cli`, `@snag/sdk`) |
| Python package | PyPI | `.github/workflows/publish.yml` (`snag-mcp`) |

## Repository layout

```text
apps/
  web/       Next.js console
  server/    Fastify API + WS hub
packages/
  cli/       snag-cli
  mcp/       snag-mcp (Python)
  sdk/       @snag/sdk
  shared/    shared contracts
  db/        internal db package
docs/
  self-hosting.md
  mcp-quickstart.md
```

## Documentation map

- Self-hosting and env setup: [`docs/self-hosting.md`](docs/self-hosting.md)
- MCP setup notes: [`docs/mcp-quickstart.md`](docs/mcp-quickstart.md)
- CLI command guide: [`packages/cli/README.md`](packages/cli/README.md)

## Monorepo scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```
