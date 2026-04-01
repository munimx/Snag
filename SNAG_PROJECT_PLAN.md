# Snag — Webhook Inspector & Visual Router

**Comprehensive Build Plan · AI-Agent Friendly**

> A lightweight, free, fully open-source webhook inspector with a CLI tunnel,
> real-time web console, request replay, configurable forwarding rules, and
> native MCP support so AI agents like Claude Code and Copilot can use it as a
> first-class tool. Hookdeck's DX, without the paywall.

---

## Table of Contents

1. [Vision & Goals](#1-vision--goals)
2. [Feature Scope](#2-feature-scope)
3. [Architecture Overview](#3-architecture-overview)
4. [Tech Stack](#4-tech-stack)
5. [Monorepo Structure](#5-monorepo-structure)
6. [Database Schema](#6-database-schema)
7. [API Design](#7-api-design)
8. [WebSocket Protocol](#8-websocket-protocol)
9. [CLI Design](#9-cli-design)
10. [MCP Server](#10-mcp-server)
11. [TypeScript SDK](#11-typescript-sdk)
12. [Deployment (100% Free)](#12-deployment-100-free)
13. [Atomic Commit Plan](#13-atomic-commit-plan)
14. [Environment Variables](#14-environment-variables)
15. [Resume Talking Points](#15-resume-talking-points)

---

## 1. Vision & Goals

### What Snag Is

Snag gives developers a **permanent, inspectable URL** that captures any HTTP
request in real time. You see every header, body, latency, and status in a clean
web console — and you can replay, filter, or forward any request to another
destination with one click. The CLI creates a **localhost tunnel** so
Stripe/GitHub/Shopify webhooks reach your laptop without ngrok or any account.

### Differentiation vs Hookdeck

| Feature                         | Hookdeck                       | Snag                               |
| ------------------------------- | ------------------------------ | ---------------------------------- |
| Free tier                       | 10k events/mo, limited history | Unlimited (self-host)              |
| Account required for CLI        | Yes                            | No                                 |
| Forwarding rules                | Yes (paid)                     | Yes (free)                         |
| MCP server (AI agent support)   | No                             | Yes (Claude Code, Cursor, Copilot) |
| TypeScript SDK                  | No                             | Yes (`@snag/sdk`)                  |
| Machine-readable CLI (`--json`) | No                             | Yes                                |
| Open source                     | No                             | Yes (MIT)                          |
| Self-hostable                   | No                             | Yes (Docker Compose)               |
| Pricing                         | $0–$250/mo                     | Free forever                       |

### Goals

- **Resume goal**: Demonstrate full-stack ownership — real-time backend, React
  frontend, CLI tooling, queue workers, WebSocket tunneling, MCP server,
  TypeScript SDK, public deployment.
- **Product goal**: Become the go-to free Hookdeck alternative; the only webhook
  inspector with native MCP support; monetize via cloud-hosted Pro plan.
- **Learning goal**: Ship production-grade code across the entire web stack.

---

## 2. Feature Scope

### Phase 1 — Core Inspector (Ship This First)

- [ ] Unique endpoint per project: `https://snag.dev/h/{token}`
- [ ] Capture any HTTP method: GET, POST, PUT, PATCH, DELETE
- [ ] Real-time web console via WebSocket (no refresh needed)
- [ ] Full request detail: headers, body (JSON/form/raw), query params, latency,
      response status
- [ ] Request history (last 500 per endpoint, stored in DB)
- [ ] Replay any request to any target URL
- [ ] Copy as cURL button
- [ ] JSON diff viewer for comparing two requests
- [ ] No account required for basic use (guest session via ephemeral token)

### Phase 2 — CLI Tunnel

- [ ] `snag listen <port>` — creates a public URL, forwards to localhost
- [ ] Terminal UI with request list (ink-based, keyboard navigation)
- [ ] `snag replay <request-id>` — replay from CLI
- [ ] `snag filter --body "type=order.created"` — filter events in terminal
- [ ] `snag inspect <request-id>` — view full request in pager
- [ ] Stable URL across restarts (persisted token in `~/.snag/config.json`)
- [ ] No account needed; `snag login` optional for persistence

### Phase 3 — Forwarding Rules

- [ ] Static forward rules: forward all requests matching a filter to a
      destination URL
  - Filter on: method, body key/value, header value, path prefix
  - Fan-out: one endpoint → multiple destination URLs
- [ ] Background job delivery with retry (BullMQ)
- [ ] Delivery log: per-rule history of forward attempts, response status,
      latency, error
- [ ] `snag_create_forward_rule` MCP tool for programmatic rule creation

### Phase 4 — MCP Server & TypeScript SDK

- [ ] MCP server (`snag-mcp`) — connects any MCP-compatible agent to Snag
  - `snag_create_endpoint` — returns `{ token, url }`, no account needed
  - `snag_list_requests` — paginated history for a token
  - `snag_get_request` — full detail: headers, body, latency, status
  - `snag_replay_request` — replay to a target URL, returns response
  - `snag_wait_for_request` — long-polls until next request arrives (30s
    timeout)
  - `snag_create_forward_rule` — create a destination rule without the UI
  - `snag_delete_endpoint` — cleanup after agent session
- [ ] TypeScript SDK (`@snag/sdk`) — thin typed REST + WS wrapper for
      programmatic use
  - `snag.createEndpoint()`, `endpoint.waitForRequest()`, `request.replay()`
  - Sync and async support, full TypeScript types, JSDoc comments
- [ ] Machine-readable CLI (`--json`, `--silent` flags on all commands)
- [ ] Claude Desktop / Claude Code / Cursor config snippet in docs

### Phase 5 — Auth & Teams

- [ ] Magic link auth (email, no password)
- [ ] Projects with shareable links
- [ ] Team member invite
- [ ] 30-day history for authenticated users

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL WORLD                            │
│  Stripe / GitHub / Shopify / Any HTTP client                     │
└─────────────┬───────────────────────────────────────────────────┘
              │ POST https://snag.dev/h/{token}
              ▼
┌─────────────────────────────┐
│      apps/server (Fastify)  │  ← Deployed on Fly.io
│                             │
│  /h/:token  → capture req   │
│  /ws        → WS upgrade    │
│  /api/*     → REST API      │
│                             │
│  [BullMQ Worker]            │  ← Forward rule delivery
│  [WS Hub]   → broadcast     │  ← Push to web + CLI + MCP + SDK
└──────┬──────────────────────┘
       │ Supabase (PostgreSQL)
       │ Upstash Redis (queue)
       ▼
┌──────────────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐
│  apps/web        │  │ packages/cli │  │ packages/   │  │ packages/sdk   │
│  (Next.js)       │  │              │  │ mcp         │  │ (@snag/sdk)    │
│                  │  │ snag listen  │  │             │  │                │
│  /console → feed │◄─│ ↕ WS tunnel  │  │ snag-mcp    │  │ programmatic   │
│  /history        │  │ → localhost  │  │ ↕ stdio/SSE │  │ REST + WS      │
│  /rules          │  │              │  │             │  │ client         │
└──────────────────┘  └──────────────┘  └──────┬──────┘  └────────┬───────┘
                                                │                  │
                                    ┌───────────▼──────────────────▼──────┐
                                    │        AI AGENT CONSUMERS            │
                                    │  Claude Code · Cursor · Copilot CLI  │
                                    │  Aider · Continue · any MCP client   │
                                    └─────────────────────────────────────┘
```

### Data Flow — CLI Tunnel

```
1. Developer runs: snag listen 3000
2. CLI opens WebSocket to wss://snag-server.fly.dev/ws
3. CLI sends { type: "register", token: "abc123" }
4. Server maps token → WS connection
5. Stripe sends POST to https://snag.dev/h/abc123
6. Server captures request → saves to DB → broadcasts to all WS clients on token
7. CLI receives event → forwards HTTP request to localhost:3000
8. localhost:3000 responds → CLI sends response back to server via WS
9. Server logs response status/latency
```

### Data Flow — MCP Agent (e.g. Claude Code)

```
1. Developer configures snag-mcp in claude_desktop_config.json
2. Claude Code starts snag-mcp as a subprocess (stdio transport)
3. Agent calls tool: snag_create_endpoint → server returns { token, url }
4. Agent tells developer: "Send a test Stripe event to https://snag.dev/h/abc123"
5. Developer triggers Stripe test event in dashboard
6. Agent calls: snag_wait_for_request({ token }) → long-polls until request arrives
7. Server receives webhook → saves to DB → REST response returns to MCP tool
8. Agent receives full request body (real Stripe payload) as tool result
9. Agent generates TypeScript handler, Zod schema, or test fixture from real data
10. Agent calls snag_delete_endpoint to clean up
```

---

## 4. Tech Stack

### Why Each Choice Was Made

| Layer               | Choice                               | Why                                                                                                                           |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Monorepo            | pnpm workspaces + Turborepo          | Fast installs, cached builds, single repo for CLI+server+web+mcp+sdk                                                          |
| Web framework       | Next.js 14 (App Router)              | SSR, API routes, Vercel deployment, resume-friendly                                                                           |
| Server              | Fastify                              | 3× faster than Express, native WS, TypeScript-first                                                                           |
| Real-time           | `ws` library + custom hub            | No Socket.io overhead; raw WS is sufficient and resume-worthy to explain                                                      |
| CLI                 | Commander + Ink (React for terminal) | Ink allows real React components in terminal — visually impressive                                                            |
| MCP Server          | Python + `mcp` (PyPI)                | Anthropic's Python MCP SDK is more mature than the JS one; polyglot monorepo shows range; `uv` for fast dependency management |
| TypeScript SDK      | Hand-rolled REST + WS client         | Thin, typed, no runtime deps; publishable to npm as `@snag/sdk`                                                               |
| Database            | Supabase (PostgreSQL)                | Free tier, Prisma compatible, real-time subscriptions as bonus                                                                |
| Queue               | BullMQ + Upstash Redis               | Industry standard for job queues; Upstash is free serverless Redis                                                            |
| ORM                 | Prisma                               | Type-safe DB access, great DX, easy migrations                                                                                |
| Styling             | Tailwind CSS + shadcn/ui             | Fast iteration, no design debt                                                                                                |
| Auth                | Lucia Auth (email magic link)        | Lightweight, no vendor lock-in, fully free                                                                                    |
| Deployment — web    | Vercel                               | Free, zero config for Next.js                                                                                                 |
| Deployment — server | Fly.io                               | Free tier (3 shared VMs), persistent WebSocket support                                                                        |
| Deployment — DB     | Supabase                             | Free: 500MB, 2 projects                                                                                                       |
| Deployment — Redis  | Upstash                              | Free: 10k requests/day                                                                                                        |
| CI/CD               | GitHub Actions                       | Free for public repos                                                                                                         |

### Zero-Cost Stack Summary

```
Vercel (web)     → Free forever on hobby plan
Fly.io (server)  → Free: 3 shared-cpu-1x, 256MB RAM each
Supabase (DB)    → Free: 500MB PostgreSQL
Upstash (Redis)  → Free: 10,000 requests/day
GitHub Actions   → Free: 2,000 min/mo on public repos
Total monthly cost → $0
```

---

## 5. Monorepo Structure

```
snag/
├── apps/
│   ├── web/                          # Next.js 14 dashboard
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/page.tsx
│   │   │   ├── console/
│   │   │   │   └── [token]/page.tsx  # Live request console
│   │   │   ├── rules/
│   │   │   │   └── [token]/page.tsx  # Forwarding rules list + create
│   │   │   ├── history/
│   │   │   │   └── [token]/page.tsx  # Request history + search
│   │   │   ├── api/
│   │   │   │   └── [...]/route.ts    # Thin BFF layer
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── console/              # RequestList, RequestDetail, ReplayPanel
│   │   │   ├── rules/                # RuleList, RuleForm, DeliveryLog
│   │   │   └── ui/                   # shadcn components
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts
│   │   ├── lib/
│   │   │   └── ws-client.ts
│   │   └── package.json
│   │
│   └── server/                       # Fastify server
│       ├── src/
│       │   ├── routes/
│       │   │   ├── capture.ts        # POST /h/:token
│       │   │   ├── api/
│       │   │   │   ├── requests.ts   # GET/DELETE request history
│       │   │   │   ├── endpoints.ts  # CRUD endpoints
│       │   │   │   └── rules.ts      # CRUD forwarding rules
│       │   │   └── health.ts
│       │   ├── ws/
│       │   │   ├── hub.ts            # WS connection registry
│       │   │   └── tunnel.ts         # CLI tunnel protocol handler
│       │   ├── workers/
│       │   │   └── delivery.ts       # BullMQ forward-rule worker
│       │   ├── lib/
│       │   │   ├── db.ts             # Prisma client singleton
│       │   │   └── queue.ts          # BullMQ setup
│       │   └── index.ts              # Fastify app entry
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── cli/                          # npm package: snag-cli
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── listen.tsx        # snag listen <port>
│   │   │   │   ├── replay.ts         # snag replay <id> [--json]
│   │   │   │   ├── inspect.ts        # snag inspect <id> [--json]
│   │   │   │   └── login.ts          # snag login
│   │   │   ├── ui/
│   │   │   │   ├── App.tsx           # Root Ink component
│   │   │   │   ├── RequestList.tsx   # Scrollable request list
│   │   │   │   └── RequestDetail.tsx # Full request detail pane
│   │   │   ├── tunnel/
│   │   │   │   └── client.ts         # WS tunnel client
│   │   │   ├── config.ts             # ~/.snag/config.json r/w
│   │   │   └── index.ts              # CLI entry (commander)
│   │   └── package.json
│   │
│   ├── mcp/                          # PyPI package: snag-mcp (Python)
│   │   ├── snag_mcp/
│   │   │   ├── tools/
│   │   │   │   ├── create_endpoint.py
│   │   │   │   ├── list_requests.py
│   │   │   │   ├── get_request.py
│   │   │   │   ├── replay_request.py
│   │   │   │   ├── wait_for_request.py  # long-poll: blocks until event arrives
│   │   │   │   ├── create_forward_rule.py
│   │   │   │   └── delete_endpoint.py
│   │   │   ├── client.py             # httpx wrapper for Snag REST API
│   │   │   ├── server.py             # MCP server setup + tool registration
│   │   │   └── __main__.py           # entry: python -m snag_mcp / uvx snag-mcp
│   │   ├── pyproject.toml            # uv-managed, mcp + httpx + websockets deps
│   │   ├── uv.lock
│   │   └── README.md
│   │
│   ├── sdk/                          # npm package: @snag/sdk
│   │   ├── src/
│   │   │   ├── client.ts             # Snag main class
│   │   │   ├── endpoint.ts           # Endpoint class + waitForRequest()
│   │   │   ├── request.ts            # CapturedRequest class + replay()
│   │   │   └── ws.ts                 # WebSocket subscription helper
│   │   └── package.json
│   │
│   ├── shared/                       # Shared types + schemas
│   │   ├── src/
│   │   │   ├── types.ts              # CapturedRequest, Endpoint, Flow, etc.
│   │   │   └── ws-messages.ts        # WS message type union
│   │   └── package.json
│   │
│   └── db/                           # Prisma schema + generated client
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── mcp-quickstart.md             # Claude Code / Cursor / Copilot setup guide
│   └── sdk-guide.md                  # SDK usage + Stripe integration walkthrough
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + typecheck + test on PR
│       └── deploy.yml                # Deploy on merge to main
├── .gitignore
├── turbo.json
├── pnpm-workspace.yaml
└── package.json                      # Root: scripts + devDependencies
```

### Key Rules

- **No file deeper than 4 directories** from project root
- **No barrel re-exports** (direct imports only — faster TS, clearer deps)
- **One concern per file** — a route file only handles routing, not business
  logic
- **`packages/shared`** is the only cross-package dependency; CLI, MCP, SDK, and
  server all import from it
- **No circular deps** — enforced by Turborepo dependency graph
- **`packages/mcp` is Python** — the only non-TypeScript package; managed with
  `uv`, isolated from the pnpm workspace; CI runs it in a separate job
- **`packages/mcp` and `packages/sdk`** are independent consumers of the Snag
  REST API; they never import from each other or from `packages/cli`

---

## 6. Database Schema

```prisma
// packages/db/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())

  endpoints Endpoint[]
  sessions  Session[]
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique @default(cuid())
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id])
}

// A "project" / capture endpoint
model Endpoint {
  id          String   @id @default(cuid())
  token       String   @unique @default(cuid()) // URL token: /h/{token}
  label       String?
  userId      String?  // null = guest endpoint
  createdAt   DateTime @default(now())
  expiresAt   DateTime? // null = never (authenticated users)

  user        User?     @relation(fields: [userId], references: [id])
  requests    CapturedRequest[]
  rules       ForwardRule[]
}

model CapturedRequest {
  id          String   @id @default(cuid())
  endpointId  String
  method      String   // GET, POST, etc.
  path        String
  headers     Json     // Record<string, string>
  body        String?  // raw body string
  bodyType    String?  // json | form | raw
  query       Json     // Record<string, string>
  sourceIp    String?
  latencyMs   Int?     // time for forward delivery (null if not forwarded yet)
  status      Int?     // HTTP status from your server (null if not forwarded)
  receivedAt  DateTime @default(now())
  replays     Replay[]

  endpoint    Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@index([endpointId, receivedAt(sort: Desc)])
}

model Replay {
  id          String   @id @default(cuid())
  requestId   String
  targetUrl   String
  status      Int?
  latencyMs   Int?
  responseBody String?
  createdAt   DateTime @default(now())

  request     CapturedRequest @relation(fields: [requestId], references: [id])
}

// Simple forwarding rule — no graph, just filter + destination
model ForwardRule {
  id             String   @id @default(cuid())
  endpointId     String
  name           String?
  enabled        Boolean  @default(true)
  filterMethod   String?  // null = match any method
  filterBodyKey  String?  // null = match any body
  filterBodyVal  String?  // null = key just needs to exist
  destinationUrl String
  retries        Int      @default(3)
  createdAt      DateTime @default(now())

  endpoint    Endpoint   @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  deliveries  Delivery[]
}

// Background job delivery log (BullMQ forward)
model Delivery {
  id          String   @id @default(cuid())
  ruleId      String
  requestId   String
  targetUrl   String
  status      Int?
  attempt     Int      @default(1)
  error       String?
  createdAt   DateTime @default(now())

  rule        ForwardRule @relation(fields: [ruleId], references: [id])
}
```

---

## 7. API Design

### Capture Endpoint (no auth)

```
POST   /h/:token           Capture any request (returns 200 immediately)
GET    /h/:token           Also captured (for GET webhooks)
PUT    /h/:token           Also captured
PATCH  /h/:token           Also captured
DELETE /h/:token           Also captured
```

### REST API

```
# Endpoints
POST   /api/endpoints              Create a new endpoint (guest or authed)
GET    /api/endpoints              List user's endpoints (auth required)
DELETE /api/endpoints/:id          Delete endpoint + all requests

# Requests
GET    /api/endpoints/:token/requests         List captured requests (paginated)
GET    /api/endpoints/:token/requests/:id     Get single request detail
DELETE /api/endpoints/:token/requests/:id     Delete single request

# Replay
POST   /api/requests/:id/replay    Replay request to a target URL
                                   Body: { targetUrl: string }

# Forwarding Rules
GET    /api/endpoints/:token/rules            List forward rules
POST   /api/endpoints/:token/rules            Create a forward rule
PATCH  /api/rules/:id                         Update rule (filter/destination/name)
DELETE /api/rules/:id                         Delete rule
PATCH  /api/rules/:id/toggle                  Enable / disable rule

# Deliveries (read-only log)
GET    /api/rules/:id/deliveries              List delivery attempts for a rule

# Auth
POST   /api/auth/magic-link        Send magic link to email
GET    /api/auth/verify?token=...  Verify magic link → set session cookie
POST   /api/auth/logout
GET    /api/auth/me
```

### Pagination convention

```
GET /api/endpoints/:token/requests?page=1&limit=50&method=POST&search=order.created

Response:
{
  "data": [...],
  "meta": { "total": 342, "page": 1, "limit": 50, "hasNext": true }
}
```

---

## 8. WebSocket Protocol

All messages are JSON. Both client and server send typed message objects.

### Message Types (packages/shared/src/ws-messages.ts)

```typescript
// Client → Server
type ClientMessage =
  | { type: 'register'; token: string; clientType: 'browser' | 'cli' }
  | { type: 'ping' }
  | {
      type: 'tunnel_response';
      requestId: string;
      status: number;
      headers: Record<string, string>;
      body: string;
    };

// Server → Client
type ServerMessage =
  | { type: 'registered'; endpointId: string }
  | { type: 'request_captured'; request: CapturedRequest }
  | { type: 'pong' }
  | {
      type: 'tunnel_forward';
      requestId: string;
      method: string;
      path: string;
      headers: Record<string, string>;
      body: string;
    }
  | { type: 'error'; message: string };
```

### Lifecycle

```
CLI connects  → sends "register" with token + clientType: "cli"
Browser opens → sends "register" with token + clientType: "browser"

Webhook hits /h/:token →
  server saves to DB →
  server broadcasts "request_captured" to ALL registered clients for that token
    browser receives it → updates UI in real time
    cli receives it → if clientType is "cli", server ALSO sends "tunnel_forward"
      cli receives "tunnel_forward" → forwards HTTP to localhost:port
      cli receives response → sends "tunnel_response" back to server
      server saves latency + status to DB → broadcasts updated request to browsers
```

---

## 9. CLI Design

### Commands

```bash
# Core tunnel
snag listen 3000
snag listen 3000 --label "stripe-dev"
snag listen 3000 --token abc123          # reuse a specific token
snag listen 3000 --json                  # machine-readable: emit newline-delimited JSON (no Ink UI)
snag listen 3000 --silent                # suppress all output except errors (pipe-safe)

# Replay
snag replay req_abc123                   # replay last match to same port
snag replay req_abc123 --to http://localhost:4000/webhook
snag replay req_abc123 --json            # return response as JSON to stdout

# List / inspect (machine-readable)
snag list --token abc123                 # pretty table
snag list --token abc123 --json          # newline-delimited JSON, one object per request
snag list --token abc123 --json --limit 1  # last request only — pipe-friendly
snag inspect req_abc123                  # full request in pager (less-style)
snag inspect req_abc123 --json           # print raw JSON to stdout

# Filter (combine with listen)
snag listen 3000 --filter-body "type=order.created"
snag listen 3000 --filter-method POST

# Auth
snag login                               # opens browser for magic link
snag logout
snag whoami

# Config
snag config set server https://my-self-hosted.com
```

### Terminal UI (Ink)

```
╔══ SNAG ══════════════════════════════════════════════════════╗
║  ● Listening on localhost:3000                               ║
║  ⬡ Public URL: https://snag.dev/h/abc123def456              ║
╠══ REQUESTS ══════════════════════════════════════════════════╣
║  ▶  POST  /webhook         200  12ms  2m ago   order.created ║
║     POST  /webhook         500  340ms 3m ago   payment.fail  ║
║     GET   /ping            200  2ms   10m ago               ║
╠══ DETAIL (↑↓ navigate · r replay · c copy curl · q quit) ═══╣
║  Method:  POST                                               ║
║  Path:    /webhook                                           ║
║  Body:    {                                                  ║
║             "type": "order.created",                         ║
║             "id": "ord_123"                                  ║
║           }                                                  ║
╚══════════════════════════════════════════════════════════════╝
```

**Keyboard shortcuts:**

- `↑ / ↓` or `k / j` — navigate requests
- `r` — replay selected to localhost
- `c` — copy as cURL to clipboard
- `i` — expand full detail
- `f` — open filter prompt
- `q` — quit

### Config File

```json
// ~/.snag/config.json
{
  "token": "abc123def456",
  "serverUrl": "https://snag-server.fly.dev",
  "authToken": null
}
```

---

## 10. MCP Server

The MCP server (`snag-mcp`) is written in **Python** using Anthropic's `mcp`
PyPI package — the most mature MCP SDK available. It runs as a subprocess over
stdio; agents spawn it with a single config entry and get Snag as native tools.

### Dependencies (`packages/mcp/pyproject.toml`)

```toml
[project]
name = "snag-mcp"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "mcp>=1.0.0",          # Anthropic's MCP Python SDK
  "httpx>=0.27.0",       # async HTTP for Snag REST API calls
  "websockets>=12.0",    # async WS for wait_for_request long-poll
  "pydantic>=2.0.0",     # typed request/response models
]

[project.scripts]
snag-mcp = "snag_mcp.__main__:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

### Installation & Config

```bash
# Run directly — no install needed (recommended for agents)
uvx snag-mcp

# Or install globally
uv tool install snag-mcp
pip install snag-mcp
```

**Claude Desktop / Claude Code** (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "snag": {
      "command": "uvx",
      "args": ["snag-mcp"],
      "env": {
        "SNAG_SERVER_URL": "https://snag-server.fly.dev"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "snag": {
      "command": "uvx",
      "args": ["snag-mcp"]
    }
  }
}
```

### Server Entry (`packages/mcp/snag_mcp/server.py`)

```python
import os
import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

SERVER_URL = os.getenv("SNAG_SERVER_URL", "https://snag-server.fly.dev")

app = Server("snag")

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="snag_create_endpoint",
            description="Create a new webhook capture endpoint. Returns a public URL that captures any HTTP request.",
            inputSchema={
                "type": "object",
                "properties": {
                    "label": {"type": "string", "description": "Optional human-readable label"}
                }
            }
        ),
        types.Tool(
            name="snag_wait_for_request",
            description="Block until the next HTTP request arrives on a token. Use this to capture real webhook payloads during integration work.",
            inputSchema={
                "type": "object",
                "required": ["token"],
                "properties": {
                    "token":   {"type": "string"},
                    "timeout": {"type": "number", "description": "Max wait ms. Default 30000."}
                }
            }
        ),
        types.Tool(
            name="snag_list_requests",
            description="List captured requests for an endpoint, newest first.",
            inputSchema={
                "type": "object",
                "required": ["token"],
                "properties": {
                    "token":  {"type": "string"},
                    "limit":  {"type": "number", "default": 20},
                    "method": {"type": "string"}
                }
            }
        ),
        types.Tool(
            name="snag_get_request",
            description="Get full detail for a single captured request by ID.",
            inputSchema={
                "type": "object",
                "required": ["id"],
                "properties": {"id": {"type": "string"}}
            }
        ),
        types.Tool(
            name="snag_replay_request",
            description="Replay a captured request to a target URL. Returns response status, headers, and body.",
            inputSchema={
                "type": "object",
                "required": ["id", "target_url"],
                "properties": {
                    "id":         {"type": "string"},
                    "target_url": {"type": "string"}
                }
            }
        ),
        types.Tool(
            name="snag_create_forward_rule",
            description="Create a forwarding rule: requests matching the filter are forwarded to destination_url.",
            inputSchema={
                "type": "object",
                "required": ["token", "destination_url"],
                "properties": {
                    "token":           {"type": "string"},
                    "destination_url": {"type": "string"},
                    "filter_method":   {"type": "string"},
                    "filter_body_key": {"type": "string"}
                }
            }
        ),
        types.Tool(
            name="snag_delete_endpoint",
            description="Delete an endpoint and all its captured requests. Call after agent session to clean up.",
            inputSchema={
                "type": "object",
                "required": ["token"],
                "properties": {"token": {"type": "string"}}
            }
        ),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    from snag_mcp import tools
    handler = getattr(tools, name)
    result = await handler(SERVER_URL, arguments)
    return [types.TextContent(type="text", text=result)]

async def main():
    async with stdio_server() as streams:
        await app.run(*streams, app.create_initialization_options())
```

### Tool Implementation Pattern (`packages/mcp/snag_mcp/tools/wait_for_request.py`)

```python
import asyncio
import json
import websockets
import httpx

async def snag_wait_for_request(server_url: str, args: dict) -> str:
    """
    Long-poll strategy: open a WebSocket connection, register on the token,
    and resolve when the first request_captured event arrives.
    """
    token = args["token"]
    timeout_ms = args.get("timeout", 30_000)
    ws_url = server_url.replace("https://", "wss://").replace("http://", "ws://")

    try:
        async with websockets.connect(f"{ws_url}/ws") as ws:
            # Register as a browser-type client for this token
            await ws.send(json.dumps({"type": "register", "token": token, "clientType": "browser"}))

            async def wait_for_event():
                async for raw in ws:
                    msg = json.loads(raw)
                    if msg.get("type") == "request_captured":
                        return json.dumps(msg["request"], indent=2)

            return await asyncio.wait_for(wait_for_event(), timeout=timeout_ms / 1000)

    except asyncio.TimeoutError:
        return json.dumps({"error": f"No request received within {timeout_ms}ms"})
```

### Example Agent Session (Claude Code)

```
User: I'm integrating Stripe webhooks for order.created events.
      Help me write the handler.

Claude Code:
  → calls snag_create_endpoint({ "label": "stripe-order" })
  ← { "token": "abc123", "url": "https://snag.dev/h/abc123" }

  "I've created a capture endpoint at https://snag.dev/h/abc123.
   Go to Stripe dashboard → Webhooks → Add endpoint → paste that URL.
   Send a test 'order.created' event. I'll wait."

  → calls snag_wait_for_request({ "token": "abc123", "timeout": 60000 })
  [developer sends test event from Stripe dashboard]
  ← {
      "method": "POST",
      "headers": { "stripe-signature": "t=...,v1=..." },
      "body": { "type": "order.created", "data": { "object": { "id": "ord_123", "amount": 4999 } } }
    }

  "Got it. Here's your handler with full TypeScript types inferred
   from the real payload, including Stripe signature verification:"

  [generates handler.ts + types.ts from actual data]

  → calls snag_delete_endpoint({ "token": "abc123" })
```

---

## 11. TypeScript SDK

The `@snag/sdk` package is a thin, typed client for the Snag API. Zero
production dependencies. Ships with full TypeScript types and JSDoc.

### Installation

```bash
npm install @snag/sdk
```

### Usage

```typescript
import { Snag } from '@snag/sdk';

// Uses https://snag-server.fly.dev by default
// Override with: new Snag({ serverUrl: "https://my-self-hosted.com" })
const snag = new Snag();

// Create an endpoint
const endpoint = await snag.createEndpoint({ label: 'stripe-test' });
console.log(endpoint.url); // https://snag.dev/h/abc123

// Block until a request arrives (WebSocket under the hood)
const request = await endpoint.waitForRequest({ timeout: 30_000 });
console.log(request.body); // parsed JSON body
console.log(request.method); // "POST"
console.log(request.headers['stripe-signature']);

// Replay to a different URL
const response = await request.replay('http://localhost:3000/webhook');
console.log(response.status); // 200

// List recent requests
const requests = await endpoint.listRequests({ limit: 10, method: 'POST' });

// Subscribe to live requests (WebSocket stream)
endpoint.onRequest((req) => {
  console.log('New request:', req.method, req.path);
});

// Cleanup
await endpoint.delete();
```

### Class API

```typescript
class Snag {
  constructor(options?: { serverUrl?: string; authToken?: string });
  createEndpoint(options?: { label?: string }): Promise<Endpoint>;
  getEndpoint(token: string): Promise<Endpoint>;
}

class Endpoint {
  readonly token: string;
  readonly url: string;

  listRequests(options?: {
    limit?: number;
    method?: string;
  }): Promise<CapturedRequest[]>;
  waitForRequest(options?: { timeout?: number }): Promise<CapturedRequest>;
  onRequest(handler: (req: CapturedRequest) => void): () => void; // returns unsubscribe fn
  delete(): Promise<void>;
}

class CapturedRequest {
  readonly id: string;
  readonly method: string;
  readonly path: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  readonly query: Record<string, string>;
  readonly receivedAt: Date;

  replay(
    targetUrl: string,
  ): Promise<{ status: number; body: string; latencyMs: number }>;
  toCurl(): string;
}
```

---

## 12. Deployment (100% Free)

### apps/server → Fly.io

```toml
# apps/server/fly.toml
app = "snag-server"
primary_region = "sin"  # Singapore — close to Lahore

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8080
  force_https   = true
  auto_stop_machines = false   # keep alive for WS connections

[[vm]]
  cpu_kind = "shared"
  cpus     = 1
  memory   = "256mb"
```

```dockerfile
# apps/server/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### apps/web → Vercel

- Connect GitHub repo to Vercel
- Set root directory to `apps/web`
- Environment variables set in Vercel dashboard
- Auto-deploy on every merge to `main`

### Database → Supabase

```bash
# Get connection string from Supabase dashboard
# Add to apps/server/.env:
DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
```

### Redis → Upstash

```bash
# Create free Redis DB on upstash.com
# Add to apps/server/.env:
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

### GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck lint test
```

---

## 13. Atomic Commit Plan

> Each commit is a single logical unit. One concern. Passes lint/typecheck. No
> WIP commits. Format: `type(scope): description` — never co-authored.

### Phase 0 — Repo Setup

```
feat(repo): init pnpm monorepo with turbo, workspaces, and base tsconfig
feat(repo): add eslint, prettier, and husky pre-commit hook
feat(db): add prisma schema with Endpoint, CapturedRequest, Replay, Flow, Delivery
feat(db): add initial migration and prisma generate script
feat(shared): add CapturedRequest, Endpoint, and Flow TypeScript types
feat(shared): add WebSocket message type union (ClientMessage, ServerMessage)
```

### Phase 1 — Server Core

```
feat(server): init Fastify app with health route and graceful shutdown
feat(server): add capture route POST/GET/PUT/PATCH/DELETE /h/:token
feat(server): save captured request to database via Prisma
feat(server): add WebSocket hub with register, broadcast, and cleanup
feat(server): broadcast request_captured to all clients on same token
feat(server): add REST route GET /api/endpoints/:token/requests with pagination
feat(server): add REST route GET /api/requests/:id for single request detail
feat(server): add REST route DELETE /api/requests/:id
feat(server): add replay route POST /api/requests/:id/replay with latency tracking
feat(server): add long-poll route GET /api/endpoints/:token/wait for MCP + SDK use
feat(server): add Dockerfile and fly.toml for Fly.io deployment
```

### Phase 2 — Web Console

```
feat(web): init Next.js 14 app with Tailwind, shadcn/ui, and base layout
feat(web): add console page /console/:token with request list component
feat(web): add useWebSocket hook with reconnect and typed message handling
feat(web): wire WebSocket to console — new requests appear without refresh
feat(web): add RequestDetail panel with headers, body (JSON highlighted), query
feat(web): add ReplayPanel — target URL input, fire replay, show response status
feat(web): add copy-as-cURL button to RequestDetail
feat(web): add request history search and method filter
feat(web): add empty state and loading skeleton for request list
feat(web): add landing page with one-click endpoint generation
```

### Phase 3 — CLI

```
feat(cli): init CLI package with commander and ink dependencies
feat(cli): add config module for ~/.snag/config.json read/write
feat(cli): add tunnel client — WebSocket connect, register, and ping/pong
feat(cli): add tunnel_forward handler — forward to localhost and send tunnel_response
feat(cli): add listen command with Ink UI (RequestList + RequestDetail panes)
feat(cli): add keyboard navigation (↑↓ kj), replay (r), copy cURL (c), quit (q)
feat(cli): add filter flags --filter-body, --filter-method to listen command
feat(cli): add replay command: snag replay <id> --to <url>
feat(cli): add inspect command: full request in terminal pager
feat(cli): add login command: open browser for magic link auth
feat(cli): add stable token persistence across restarts
feat(cli): add --json flag to listen, list, inspect, replay for machine-readable output
feat(cli): add --silent flag to suppress Ink UI for piped and scripted usage
feat(cli): add npm publish config and README for snag-cli package
```

### Phase 4 — Forwarding Rules

```
feat(db): add ForwardRule and Delivery models to Prisma schema and migrate
feat(server): add REST routes CRUD /api/endpoints/:token/rules
feat(server): add REST route GET /api/rules/:id/deliveries
feat(server): add BullMQ delivery worker — evaluate rules on request capture
feat(server): add rule matching logic: method, body key/value filter
feat(server): add fan-out delivery — one rule matches → multiple destination URLs
feat(web): add /rules/:token page with rule list and inline create form
feat(web): add RuleForm component with filter and destination fields
feat(web): add DeliveryLog component — show attempts, status, latency, error
```

### Phase 5 — MCP Server (Python)

```
feat(mcp): init snag-mcp Python package with uv, pyproject.toml, and mcp dependency
feat(mcp): add httpx client wrapper for Snag REST API with typed Pydantic models
feat(mcp): add MCP server entry with stdio transport and tool registry
feat(mcp): add snag_create_endpoint and snag_delete_endpoint tools
feat(mcp): add snag_list_requests tool with limit and method filter params
feat(mcp): add snag_get_request tool returning full request detail
feat(mcp): add snag_replay_request tool with target URL and response return
feat(mcp): add snag_wait_for_request tool using websockets async long-poll
feat(mcp): add snag_create_forward_rule tool for programmatic routing
feat(mcp): add uvx entry point and PyPI publish config
feat(ci): add separate Python CI job for mcp package (ruff, mypy, pytest)
docs: add mcp-quickstart.md with uvx config for Claude Code, Cursor, and Copilot
docs: add agent walkthrough — Stripe integration example using snag_wait_for_request
```

### Phase 6 — TypeScript SDK

```
feat(sdk): init @snag/sdk package with zero runtime dependencies
feat(sdk): add Snag client class with createEndpoint and getEndpoint methods
feat(sdk): add Endpoint class with listRequests and delete methods
feat(sdk): add endpoint.waitForRequest() using WebSocket + Promise with timeout
feat(sdk): add endpoint.onRequest() subscription returning unsubscribe function
feat(sdk): add CapturedRequest class with replay() and toCurl() methods
feat(sdk): add full TypeScript types, JSDoc comments, and generated .d.ts output
feat(sdk): add npm publish config with ESM + CJS dual output
docs: add sdk-guide.md with Stripe integration walkthrough and full API reference
```

### Phase 7 — Auth

```
feat(server): add User, Session models and magic link email via Resend
feat(server): add POST /api/auth/magic-link and GET /api/auth/verify routes
feat(web): add /login page with email input and magic link flow
feat(web): add auth context and useAuth hook
feat(web): gate /console/:token history beyond 24hr behind auth
feat(cli): wire snag login to magic link flow via browser
feat(mcp): add optional SNAG_AUTH_TOKEN env var support for authenticated requests
```

### Phase 8 — Polish & Deploy

```
feat(ci): add GitHub Actions CI workflow for lint, typecheck, test on PR
feat(ci): add GitHub Actions deploy workflow for Fly.io on merge to main
feat(ci): add npm publish workflow for cli and sdk packages on version tag
feat(ci): add PyPI publish workflow for snag-mcp package on version tag
feat(server): add rate limiting (100 req/min per token) via fastify-rate-limit
feat(server): add request body size limit (1MB) and graceful 413 response
feat(web): add favicon, og:image, and meta tags
feat(web): add JSON diff viewer for comparing two selected requests
docs: add README with quickstart, architecture diagram, and self-hosting guide
docs: add self-hosting guide with Docker Compose for server + Redis + Postgres
chore: add MIT license
```

---

## 14. Environment Variables

### apps/server/.env

```bash
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL=postgresql://postgres:pass@db.ref.supabase.co:5432/postgres

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Auth (Resend for magic link emails)
RESEND_API_KEY=re_...
MAGIC_LINK_SECRET=random-32-char-string
SESSION_SECRET=random-32-char-string

# App
PUBLIC_APP_URL=https://snag.vercel.app
```

### apps/web/.env.local

```bash
NEXT_PUBLIC_SERVER_URL=https://snag-server.fly.dev
NEXT_PUBLIC_WS_URL=wss://snag-server.fly.dev/ws
```

### packages/cli (read at runtime)

```jsonc
// ~/.snag/config.json — not an .env file
{
  "serverUrl": "https://snag-server.fly.dev",
  "token": "abc123", // persistent endpoint token
  "authToken": null, // null until snag login
}
```

### packages/mcp (env vars at agent spawn time)

```bash
SNAG_SERVER_URL=https://snag-server.fly.dev   # override to self-hosted instance
SNAG_AUTH_TOKEN=                               # optional, for authenticated endpoints
```

### packages/mcp local dev

```bash
cd packages/mcp
uv sync                    # install deps from uv.lock
uv run snag-mcp            # run the server locally over stdio
uv run pytest              # run tests
uv run ruff check .        # lint
uv run mypy snag_mcp/      # type check
```

---

## 15. Resume Talking Points

When asked about this project in interviews, here is what each layer
demonstrates:

**Real-time (WebSocket Hub)**

> "I built a custom WebSocket hub that multiplexes connections across browser
> clients, CLI tunnel clients, and SDK subscribers using the same token-based
> room. When a webhook arrives, the server broadcasts to all room members
> simultaneously — browsers update their UI, CLI clients proxy the request to
> localhost, and SDK callers resolve their `waitForRequest()` promise."

**Background Jobs (BullMQ)**

> "Forward rules run as BullMQ jobs backed by Upstash Redis. Each job retries
> with exponential backoff on failure. I store delivery attempts in PostgreSQL
> so you can see exactly which retry succeeded and why earlier ones failed."

**CLI Tooling (Ink)**

> "The CLI is built with Ink — React's reconciler for terminal UIs. The request
> list and detail pane are actual React components that re-render as WebSocket
> messages arrive. It's the same mental model as the web, just rendered to ANSI
> instead of DOM. The `--json` flag bypasses Ink entirely and emits
> newline-delimited JSON, making it pipe-friendly for shell-based agents like
> Aider."

**MCP Server (Python)**

> "The MCP server is the one Python package in the monorepo — a deliberate
> choice because Anthropic's Python `mcp` SDK is more mature than the JS one.
> The interesting tool is `snag_wait_for_request`: it opens an async WebSocket
> via the `websockets` library, registers on the token room, and resolves when
> the first `request_captured` event arrives. The whole thing runs as a
> subprocess over stdio — agents spawn it with `uvx snag-mcp` and get Snag as
> native tools with zero configuration. Having a polyglot monorepo with a Python
> island inside a TypeScript workspace is also a good conversation starter about
> when to reach for the right tool rather than the consistent one."

**TypeScript SDK**

> "The `@snag/sdk` package has zero production dependencies.
> `endpoint.waitForRequest()` opens a WebSocket, resolves the promise on the
> first matching `request_captured` event, then tears down the socket. The class
> API mirrors the mental model — you hold an Endpoint object, call methods on
> it, get back typed CapturedRequest objects. Ships dual ESM/CJS with generated
> `.d.ts` files."

**Forwarding Rules & Background Jobs (BullMQ)**

> "Forward rules are flat filter-plus-destination records in PostgreSQL —
> method, body key/value, destination URL, retry count. When a request arrives,
> the capture route enqueues a BullMQ job for every matching rule. The worker
> evaluates each job, POSTs to the destination, and writes a Delivery row with
> status, latency, and any error. Retries use BullMQ's built-in exponential
> backoff. The rules page in the web console shows the delivery log live so you
> can see exactly which attempt succeeded and why earlier ones failed."

**Full-Stack Ownership**

> "I own the entire system end-to-end: the Fastify capture server on Fly.io,
> Prisma schema on Supabase, Next.js frontend on Vercel, BullMQ workers, an
> npm-published CLI, a Python MCP server on PyPI, and a typed TypeScript SDK. I
> debugged WebSocket reconnection edge cases, async timeout races in the Python
> MCP layer, queue worker memory leaks, and Fly.io cold-start latency on the
> free tier. The monorepo is polyglot — TypeScript everywhere except the MCP
> package which is Python — and that was a deliberate call based on SDK
> maturity, not habit."

---

_Generated: March 2026 — AI-agent-friendly Markdown. All code references are
implementation targets, not boilerplate._
