# AGENTS.md — Snag Monorepo

> **Read this file completely before touching any code.** This file is the
> authoritative source of truth for how this codebase is structured, how
> decisions are made, and what patterns to follow. When in doubt, check here
> first — then check existing code — then ask.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Agent Tools & Model Routing](#2-agent-tools--model-routing)
3. [Monorepo Layout](#3-monorepo-layout)
4. [Language & Runtime Per Package](#4-language--runtime-per-package)
5. [Local Development Setup](#5-local-development-setup)
6. [Running Each Package](#6-running-each-package)
7. [TypeScript Conventions](#7-typescript-conventions)
8. [Python Conventions (packages/mcp only)](#8-python-conventions-packagesmcp-only)
9. [Database & Prisma Conventions](#9-database--prisma-conventions)
10. [API Conventions](#10-api-conventions)
11. [WebSocket Protocol](#11-websocket-protocol)
12. [Testing Conventions](#12-testing-conventions)
13. [Commit Conventions](#13-commit-conventions)
14. [Git Branching](#14-git-branching)
15. [Adding New Features — Decision Guide](#15-adding-new-features--decision-guide)
16. [Absolute Prohibitions](#16-absolute-prohibitions)
17. [Environment Variables Reference](#17-environment-variables-reference)
18. [Current Build Status](#18-current-build-status)
19. [Dependency Rules](#19-dependency-rules)
20. [Error Handling Patterns](#20-error-handling-patterns)
21. [Key Data Types](#21-key-data-types)
22. [CI Behaviour](#22-ci-behaviour)

---

## 1. Project Overview

**Snag** is a webhook inspector and forwarder. It gives developers a permanent,
inspectable public URL that captures any incoming HTTP request in real time.
Think Hookdeck, but free, open-source, and with a CLI tunnel, configurable
forwarding rules, a Python MCP server, and a TypeScript SDK.

**The five surfaces:**

| Surface        | Package        | Purpose                                             |
| -------------- | -------------- | --------------------------------------------------- |
| Web console    | `apps/web`     | Live request feed, replay, forwarding rules UI      |
| Capture server | `apps/server`  | Receives webhooks, stores them, broadcasts via WS   |
| CLI            | `packages/cli` | Tunnel + terminal UI for local development          |
| MCP server     | `packages/mcp` | AI agent integration (Claude Code, Cursor, Copilot) |
| SDK            | `packages/sdk` | Programmatic TypeScript client (`@snag/sdk`)        |

The server is the only stateful piece. Everything else is a client of
`apps/server`.

---

## 2. Agent Tools & Model Routing

> **This section is mandatory reading before any session starts.** It defines
> which tools, skills, MCP servers, and AI models to use for every category of
> task. Never deviate from these assignments without explicit instruction.

---

### 2.1 Skills — Install Before Starting

Skills are pre-built instruction sets that dramatically improve output quality
for specific task types. **Read the relevant skill file before starting any task
it covers.** Multiple skills may apply to a single task — load all of them.

| Skill             | Path                                            | When to use                                                                                                                                    |
| ----------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-design` | `/mnt/skills/public/frontend-design/SKILL.md`   | Any UI work in `apps/web` — pages, components, layouts. Read this before writing a single line of CSS or JSX.                                  |
| `mcp-builder`     | `/mnt/skills/examples/mcp-builder/SKILL.md`     | Building or modifying `packages/mcp`. Read before writing any tool handler or server entry point.                                              |
| `theme-factory`   | `/mnt/skills/examples/theme-factory/SKILL.md`   | Establishing or applying the Snag visual theme across web pages and components. Run once at the start of Phase 2 to lock in the design system. |
| `canvas-design`   | `/mnt/skills/examples/canvas-design/SKILL.md`   | Creating static design assets — logo, og:image, social card, favicon source.                                                                   |
| `doc-coauthoring` | `/mnt/skills/examples/doc-coauthoring/SKILL.md` | Writing structured docs: `README.md`, `docs/mcp-quickstart.md`, `docs/sdk-guide.md`, `docs/architecture.md`.                                   |
| `docx`            | `/mnt/skills/public/docx/SKILL.md`              | Only if a stakeholder requests a Word document export of any doc.                                                                              |

**How to load a skill:**

```
# Before starting a UI task:
view /mnt/skills/public/frontend-design/SKILL.md

# Before building the MCP server:
view /mnt/skills/examples/mcp-builder/SKILL.md

# Multiple skills for the same task (e.g. building a designed doc page):
view /mnt/skills/public/frontend-design/SKILL.md
view /mnt/skills/examples/theme-factory/SKILL.md
```

Never skip skill loading to save time. The skills encode hard-won patterns —
ignoring them produces lower-quality output that will need to be redone.

---

### 2.2 MCP Servers

Three MCP servers are connected. Each has a specific role. Do not use one for
another's job.

#### Context7 — Always use for coding

**Context7 must be used for every coding task that involves a library,
framework, or package.** Before writing implementation code that uses any
external dependency, call Context7 to fetch the current, version-accurate
documentation for that library.

```
# Examples of when to call Context7 (mandatory):
- Writing Fastify routes → fetch Fastify docs
- Using Prisma client methods → fetch Prisma docs
- Writing Ink components → fetch Ink docs
- Using BullMQ workers → fetch BullMQ docs
- Using the MCP Python SDK → fetch mcp PyPI docs
- Writing React Server Components → fetch Next.js App Router docs
- Using httpx in Python → fetch httpx docs
- Using websockets library → fetch websockets docs
```

**Never rely on training-data knowledge of library APIs.** APIs change between
versions. Context7 gives you the exact API for the version in `package.json` /
`pyproject.toml`. A wrong method signature wastes more time than the Context7
call takes.

Workflow:

```
1. Identify the library you're about to use
2. Call Context7 to resolve its library ID
3. Fetch the relevant docs section
4. Then write the code
```

#### Stitch — UI design, project setup first

**At the very start of Phase 2 (Web Console), before writing any `apps/web`
code, use Stitch to:**

1. Create a project named `snag` in Stitch
2. Generate screens for the following views:
   - Console page (live request feed, split-pane: list left + detail right)
   - Request detail panel (headers, body, query tabs; replay button; copy cURL)
   - History page (searchable, filterable request table)
   - Forwarding rules page (rule list + create form inline)
   - Landing page (one-click endpoint generation, public URL display)
3. Export or reference the generated designs as the **UI source of truth** for
   `apps/web`

After initial setup, use Stitch for:

- Any new page added to `apps/web` — generate the screen design before
  implementing
- Design reviews when a component feels visually inconsistent
- Generating asset exports (icons, illustrations) for the web app

**The Stitch designs are the design spec.** If there is a conflict between a
Stitch design and your own UI instinct, follow Stitch. If a Stitch design
conflicts with a skill (e.g. `frontend-design`), the skill takes precedence for
code quality, but use the Stitch design for layout and visual direction.

---

### 2.3 Model Routing

Different tasks in this project require different AI models. **Always use the
correct model for the task type.** This is not a preference — it is a hard
routing rule.

| Task category     | Model             | When it applies                                                                                                                                                               |
| ----------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Planning**      | Claude Opus 4.5   | Architecture decisions, phase planning, schema design, breaking down a feature into branches and commits, writing or updating `AGENTS.md` / `SNAG_PROJECT_PLAN.md`            |
| **Coding**        | GPT 5.3 Codex     | All implementation work — TypeScript, Python, config files, migrations, tests, CI YAML                                                                                        |
| **Designing**     | Gemini 3.1 Pro    | UI design decisions, component aesthetics, color/typography choices, reviewing Stitch screens, writing CSS/Tailwind, working with `frontend-design` or `theme-factory` skills |
| **Orchestration** | Claude Sonnet 4.5 | Coordinating multi-step tasks, routing sub-tasks to the correct model, managing context across a long session, deciding when to spawn fleet workers                           |

**Routing rules:**

```
Writing a new Fastify route?               → GPT 5.3 Codex
Deciding the database schema for Phase 4?  → Claude Opus 4.5
Choosing the visual layout for /console?   → Gemini 3.1 Pro
Breaking Phase 3 into branches + commits?  → Claude Opus 4.5
Implementing the Ink terminal UI?          → GPT 5.3 Codex
Making the landing page look good?         → Gemini 3.1 Pro
Managing a parallel build session?         → Claude Sonnet 4.5
```

When a task spans multiple categories (e.g. "design and implement the rules
page"), split it:

1. Gemini 3.1 Pro produces the design spec / component structure
2. GPT 5.3 Codex implements from that spec

---

### 2.4 Fleet — Parallel Task Execution

**Deploy `/fleet` whenever tasks can be parallelised.** Fleet spins up multiple
agent workers that execute concurrently, dramatically reducing wall-clock time
for multi-file or multi-package changes.

**Always consider fleet for:**

```
✅ Building server routes and web components simultaneously
   (feat/server-rules-api + feat/web-rules-page can be developed in parallel)

✅ Writing tests while implementing the feature
   (implementation worker + test-writing worker run concurrently)

✅ Multi-package changes in the same phase
   (e.g. Phase 1: capture route + WS hub + REST API are independent)

✅ Documentation runs
   (writing docs/mcp-quickstart.md + docs/sdk-guide.md simultaneously)

✅ Python MCP tools that are independent of each other
   (snag_create_endpoint, snag_list_requests, snag_get_request can be built in parallel)
```

**Do not use fleet for:**

```
❌ Tasks with a hard dependency order (DB migration must complete before server route)
❌ Changes to shared files (packages/shared/src/types.ts, schema.prisma)
   — only one worker should touch these at a time to avoid conflicts
❌ Tasks that require human review of output from a prior task
```

**Fleet invocation pattern:**

```
# Orchestrator (Claude Sonnet 4.5) identifies parallelisable tasks
# and dispatches to fleet:

/fleet
  worker-1: feat/server-capture-route    (GPT 5.3 Codex)
  worker-2: feat/server-ws-hub           (GPT 5.3 Codex)
  worker-3: test/server-capture-route    (GPT 5.3 Codex)
```

Each fleet worker operates on its own branch (see Section 14). Workers never
touch the same file. The orchestrator (Claude Sonnet 4.5) reviews outputs and
resolves any conflicts before merging branches to `main`.

---

## 3. Monorepo Layout

```
snag/
├── apps/
│   ├── web/          Next.js 14 (App Router) — deployed to Vercel
│   └── server/       Fastify — deployed to Fly.io
├── packages/
│   ├── cli/          Commander + Ink — published to npm as snag-cli
│   ├── mcp/          Python + mcp (PyPI) — published to PyPI as snag-mcp
│   ├── sdk/          TypeScript — published to npm as @snag/sdk
│   ├── shared/       Types + WS message union — internal only, not published
│   └── db/           Prisma schema + generated client — internal only
├── docs/
│   ├── architecture.md
│   ├── mcp-quickstart.md
│   └── sdk-guide.md
├── .github/workflows/
├── turbo.json
├── pnpm-workspace.yaml
└── AGENTS.md         ← you are here
```

**Depth rule:** No source file should be deeper than 4 directories from the repo
root. Example: `apps/server/src/routes/capture.ts` is fine (4 levels).
`apps/server/src/routes/api/v1/capture.ts` is not (5 levels — flatten it).

---

## 4. Language & Runtime Per Package

| Package           | Language            | Runtime                      | Package manager |
| ----------------- | ------------------- | ---------------------------- | --------------- |
| `apps/web`        | TypeScript          | Node 20 / Vercel Edge        | pnpm            |
| `apps/server`     | TypeScript          | Node 20                      | pnpm            |
| `packages/cli`    | TypeScript          | Node 20                      | pnpm            |
| `packages/mcp`    | **Python 3.11+**    | CPython                      | **uv**          |
| `packages/sdk`    | TypeScript          | Node 20 (browser-compatible) | pnpm            |
| `packages/shared` | TypeScript          | Node 20                      | pnpm            |
| `packages/db`     | TypeScript (Prisma) | Node 20                      | pnpm            |

**The MCP package is a Python island.** It is completely isolated from the pnpm
workspace. It has its own `pyproject.toml` and `uv.lock`. Never run `pnpm`
commands inside `packages/mcp`. Never run `uv` commands outside `packages/mcp`.

---

## 5. Local Development Setup

### First-time setup

```bash
# Prerequisites: Node 20+, pnpm 9+, Python 3.11+, uv

# 1. Install Node dependencies (all TS packages)
pnpm install

# 2. Set up the database
cp apps/server/.env.example apps/server/.env
# fill in DATABASE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

# 3. Run Prisma migrations
pnpm --filter @snag/db migrate dev

# 4. Generate Prisma client
pnpm --filter @snag/db generate

# 5. Set up the Python MCP package
cd packages/mcp
uv sync
cd ../..

# 6. Set up web env
cp apps/web/.env.example apps/web/.env.local
# NEXT_PUBLIC_SERVER_URL and NEXT_PUBLIC_WS_URL
```

### Daily dev (run all at once with Turbo)

```bash
pnpm dev        # starts apps/server + apps/web in parallel via turbo
```

### Individual packages

```bash
pnpm --filter @snag/server dev
pnpm --filter @snag/web dev
pnpm --filter snag-cli dev
cd packages/mcp && uv run snag-mcp   # MCP server (stdio, manual test)
```

---

## 6. Running Each Package

### apps/server

```bash
pnpm --filter @snag/server dev        # watch mode
pnpm --filter @snag/server build      # compile to dist/
pnpm --filter @snag/server start      # run compiled
pnpm --filter @snag/server typecheck
pnpm --filter @snag/server lint
pnpm --filter @snag/server test
```

Server starts on `http://localhost:8080`. WebSocket endpoint at
`ws://localhost:8080/ws`. Capture endpoint at `http://localhost:8080/h/:token`.

### apps/web

```bash
pnpm --filter @snag/web dev           # http://localhost:3000
pnpm --filter @snag/web build
pnpm --filter @snag/web typecheck
pnpm --filter @snag/web lint
```

### packages/cli

```bash
pnpm --filter snag-cli dev            # watch + link binary
pnpm --filter snag-cli build
pnpm --filter snag-cli typecheck

# Test the CLI against local server:
SNAG_SERVER_URL=http://localhost:8080 snag listen 4000
```

### packages/mcp (Python)

```bash
cd packages/mcp

uv sync                    # install / sync deps from uv.lock
uv run snag-mcp            # start MCP server over stdio
uv run pytest              # run tests
uv run pytest -x           # fail fast
uv run ruff check .        # lint
uv run ruff format .       # format
uv run mypy snag_mcp/      # type check

# Test a single tool manually:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"snag_create_endpoint","arguments":{}}}' \
  | SNAG_SERVER_URL=http://localhost:8080 uv run snag-mcp
```

### packages/sdk

```bash
pnpm --filter @snag/sdk build         # ESM + CJS output to dist/
pnpm --filter @snag/sdk typecheck
pnpm --filter @snag/sdk test
```

### Run all checks (pre-push)

```bash
pnpm turbo typecheck lint test        # all TS packages in parallel
cd packages/mcp && uv run ruff check . && uv run mypy snag_mcp/ && uv run pytest
```

---

## 7. TypeScript Conventions

### File naming

| Thing            | Convention                        | Example                      |
| ---------------- | --------------------------------- | ---------------------------- |
| Files            | `kebab-case.ts`                   | `capture-route.ts`           |
| React components | `PascalCase.tsx`                  | `RequestDetail.tsx`          |
| Hooks            | `camelCase.ts`                    | `useWebSocket.ts`            |
| Constants        | `SCREAMING_SNAKE` inside the file | `const MAX_BODY_SIZE = ...`  |
| Directories      | `kebab-case`                      | `ws/`, `api/`, `components/` |

### Imports

```typescript
// ✅ Direct imports only — no barrel files (index.ts re-exports)
import { broadcast } from '../ws/hub';
import type { CapturedRequest } from '@snag/shared/types';

// ❌ Never do this
import { broadcast } from '../ws'; // barrel import
import * as hub from '../ws/hub'; // namespace import (unless necessary)
```

### Types

```typescript
// ✅ Always type function parameters and return values explicitly
async function saveRequest(endpointId: string, req: RawRequest): Promise<CapturedRequest> { ... }

// ✅ Use type for unions/intersections, interface for object shapes
type ClientType = "browser" | "cli" | "sdk"
interface Endpoint { token: string; label: string | null; createdAt: Date }

// ✅ Unknown > any. If you must cast, use `as unknown as T` and leave a comment
const parsed = data as unknown as CapturedRequest  // safe: validated by zod above

// ❌ Never use `any` without a // eslint-disable comment explaining why
```

### Async

```typescript
// ✅ Always await — never fire-and-forget without catching errors
await saveRequest(endpointId, raw);

// ✅ If truly fire-and-forget, catch and log explicitly
broadcastToRoom(token, event).catch((err) =>
  logger.error({ err }, 'broadcast failed'),
);

// ❌ Never let unhandled promise rejections propagate
```

### Zod validation

All external inputs (request bodies, query params, WS messages) are validated
with Zod before use.

```typescript
import { z } from 'zod';

const replayBodySchema = z.object({
  targetUrl: z.string().url(),
});

// In route handler:
const body = replayBodySchema.parse(req.body); // throws ZodError on invalid input
```

### Environment variables

```typescript
// ✅ Access env vars through a single validated config module
// apps/server/src/lib/config.ts
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export const config = schema.parse(process.env);

// ❌ Never access process.env directly in route/service files
```

### Logging

Use `pino` (already a Fastify default). Never use `console.log` in server code.

```typescript
// ✅
req.log.info({ endpointId, method: req.method }, 'request captured');
req.log.error({ err }, 'failed to save request');

// ❌
console.log('request captured');
```

---

## 8. Python Conventions (packages/mcp only)

### File naming

All snake_case. No exceptions.

```
snag_mcp/
  tools/
    create_endpoint.py
    wait_for_request.py
  client.py
  server.py
  __main__.py
```

### Type hints

All functions must have full type hints. No `Any` without a `# type: ignore`
comment explaining why.

```python
# ✅
async def snag_wait_for_request(server_url: str, args: dict[str, object]) -> str:

# ❌
async def snag_wait_for_request(server_url, args):
```

### Async

The MCP server is fully async. All tool handlers are `async def`. Never use
`time.sleep()` — use `asyncio.sleep()`.

### Tool handler signature

Every tool handler lives in its own file under `snag_mcp/tools/` and follows
this exact signature:

```python
# snag_mcp/tools/create_endpoint.py
import httpx

async def snag_create_endpoint(server_url: str, args: dict[str, object]) -> str:
    """
    One-line description.
    Returns JSON string — the MCP framework wraps it in TextContent.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{server_url}/api/endpoints", json={"label": args.get("label")})
        resp.raise_for_status()
        return resp.text  # already JSON string
```

`server.py` dispatches to these by name:

```python
@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    from snag_mcp import tools
    handler = getattr(tools, name)  # name == "snag_create_endpoint" etc.
    result = await handler(SERVER_URL, arguments)
    return [types.TextContent(type="text", text=result)]
```

**Never** put business logic in `server.py`. It is a router only.

### Error handling in tools

```python
# ✅ Return a JSON error string — never raise from a tool handler
try:
    async with httpx.AsyncClient() as client:
        resp = await client.post(...)
        resp.raise_for_status()
        return resp.text
except httpx.HTTPStatusError as e:
    return json.dumps({"error": f"HTTP {e.response.status_code}: {e.response.text}"})
except Exception as e:
    return json.dumps({"error": str(e)})
```

### Pydantic models

Request/response shapes from the Snag REST API are typed with Pydantic models in
`snag_mcp/client.py`, not inline in tool files.

```python
# snag_mcp/client.py
from pydantic import BaseModel

class CapturedRequest(BaseModel):
    id: str
    method: str
    path: str
    headers: dict[str, str]
    body: str | None
    body_type: str | None
    query: dict[str, str]
    received_at: str
    latency_ms: int | None
    status: int | None
```

### Linting & formatting

`ruff` handles both linting and formatting. `mypy` for type checking. Config
lives in `pyproject.toml`.

```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM"]

[tool.mypy]
strict = true
python_version = "3.11"
```

---

## 9. Database & Prisma Conventions

### Schema location

`packages/db/prisma/schema.prisma` — single source of truth.

### Running migrations

```bash
# Create a new migration (development)
pnpm --filter @snag/db migrate dev --name add_replay_target_url

# Apply migrations in production (CI/CD)
pnpm --filter @snag/db migrate deploy

# After any schema change, regenerate the client
pnpm --filter @snag/db generate
```

### Importing Prisma client

```typescript
// ✅ Always import from the singleton in apps/server/src/lib/db.ts
import { db } from '../lib/db';

// apps/server/src/lib/db.ts
import { PrismaClient } from '@snag/db';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// ❌ Never instantiate PrismaClient directly in a route or service file
```

### Query conventions

```typescript
// ✅ Always select only the fields you need
const request = await db.capturedRequest.findUnique({
  where: { id },
  select: {
    id: true,
    method: true,
    body: true,
    headers: true,
    receivedAt: true,
  },
});

// ❌ Never use findUnique/findMany without a select (over-fetches)

// ✅ Always handle null explicitly
if (!request) {
  return reply.status(404).send({ error: 'Request not found' });
}

// ✅ Paginate with cursor-based pagination for large tables
const requests = await db.capturedRequest.findMany({
  where: { endpointId },
  orderBy: { receivedAt: 'desc' },
  take: limit,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
});
```

### Cascade deletes

Defined at the schema level with `onDelete: Cascade`. Never implement cascade
logic in application code.

---

## 10. API Conventions

### Route registration (Fastify)

Each route file exports a Fastify plugin. It is registered in
`apps/server/src/index.ts`.

```typescript
// apps/server/src/routes/api/requests.ts
import type { FastifyPluginAsync } from 'fastify';

const requestsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Params: { token: string };
    Querystring: { page?: number; limit?: number };
  }>('/endpoints/:token/requests', async (req, reply) => {
    // ...
  });
};

export default requestsRoutes;
```

### URL structure

```
/h/:token                            Capture (no auth, any method)
/api/endpoints                       CRUD endpoints
/api/endpoints/:token/requests       List / search requests for a token
/api/requests/:id                    Single request operations
/api/requests/:id/replay             Replay a request
/api/endpoints/:token/flows          CRUD flows
/api/flows/:id                       Single flow operations
/api/auth/magic-link                 Auth
/api/auth/verify
/api/auth/me
/api/auth/logout
/health                              Health check (no auth)
```

### Response envelope

Success responses return data directly (no wrapper). Error responses follow this
shape:

```typescript
// ✅ Success
reply.status(200).send({ id: "req_123", method: "POST", ... })
reply.status(201).send({ token: "abc123", url: "https://snag.dev/h/abc123" })
reply.status(204).send()  // delete

// ✅ Error
reply.status(404).send({ error: "Endpoint not found" })
reply.status(422).send({ error: "Validation failed", details: zodError.flatten() })
reply.status(500).send({ error: "Internal server error" })  // never expose stack traces

// ❌ Never wrap success in { data: ..., success: true } — unnecessary nesting
```

### Pagination

List endpoints support cursor-based pagination:

```
GET /api/endpoints/:token/requests?limit=50&cursor=req_abc123&method=POST&search=order.created
```

Response always includes:

```typescript
{
  data: CapturedRequest[],
  meta: {
    total: number,
    limit: number,
    nextCursor: string | null,   // ID of last item if more exist
    hasMore: boolean,
  }
}
```

---

## 11. WebSocket Protocol

### Hub behaviour

The WS hub (`apps/server/src/ws/hub.ts`) maintains a
`Map<string, Set<WebSocket>>` keyed by endpoint token. All clients registered on
the same token receive every broadcast for that token.

### Message types (defined in `packages/shared/src/ws-messages.ts`)

```typescript
// Client → Server
type ClientMessage =
  | { type: 'register'; token: string; clientType: 'browser' | 'cli' | 'sdk' }
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

### Rules for WS code

- Always validate incoming WS messages with Zod before acting on them. Invalid
  messages get a `{ type: "error" }` response — the connection is NOT closed.
- Always remove connections from the hub `Map` in the `close` event handler.
- Ping/pong heartbeat runs every 30 seconds. Connections that miss 2 consecutive
  pongs are dropped.
- Never send raw strings to WS clients — always `JSON.stringify(message)` with a
  typed object.
- The hub does not authenticate connections. Token-based isolation is sufficient
  for the current scope.

---

## 12. Testing Conventions

### TypeScript tests

Test runner is **Vitest**. Test files live next to the source file they test
with a `.test.ts` suffix.

```
apps/server/src/routes/capture.ts
apps/server/src/routes/capture.test.ts
```

```typescript
// ✅ Test the behaviour, not the implementation
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../index';

describe('POST /h/:token', () => {
  it('returns 200 and saves the request', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/h/test-token-123',
      payload: { type: 'order.created' },
    });
    expect(res.statusCode).toBe(200);
  });
});
```

### Python tests

Test runner is **pytest**. Test files live in `packages/mcp/tests/`.

```python
# packages/mcp/tests/test_create_endpoint.py
import pytest
import respx
import httpx
from snag_mcp.tools.create_endpoint import snag_create_endpoint

@pytest.mark.asyncio
async def test_create_endpoint_returns_token():
    with respx.mock:
        respx.post("http://localhost:8080/api/endpoints").mock(
            return_value=httpx.Response(201, json={"token": "abc123", "url": "https://snag.dev/h/abc123"})
        )
        result = await snag_create_endpoint("http://localhost:8080", {})
        assert '"token"' in result
        assert "abc123" in result
```

### What to test

- **Unit test**: individual functions with mocked I/O (DB, HTTP, WS)
- **Integration test**: Fastify route handlers with `app.inject()`
- **Do not** write end-to-end tests that require a running database in CI — use
  in-memory SQLite via Prisma for integration tests

### Coverage target

Aim for 80%+ coverage on `apps/server/src/` and `packages/mcp/snag_mcp/`. No
coverage requirement on `apps/web` (UI tests are expensive and break often).

---

## 13. Commit Conventions

### Format

```
type(scope): short description in imperative mood

Optional body explaining WHY, not what. Max 72 chars per line.
```

### Types

| Type       | When                                 |
| ---------- | ------------------------------------ |
| `feat`     | New functionality                    |
| `fix`      | Bug fix                              |
| `refactor` | Code change with no behaviour change |
| `test`     | Adding or fixing tests               |
| `docs`     | Documentation only                   |
| `chore`    | Build system, deps, config           |
| `perf`     | Performance improvement              |
| `ci`       | CI/CD workflow changes               |

### Scopes

Use the package or app name: `server`, `web`, `cli`, `mcp`, `sdk`, `db`,
`shared`, `repo`, `ci`, `docs`.

### Rules

- **One logical change per commit.** If you can't describe it in one line
  without "and", split it.
- **Commit must pass lint + typecheck.** Never commit code that fails
  `pnpm turbo typecheck lint`.
- **No WIP commits.** No `fix: stuff`, `chore: cleanup`, `temp`, `wip`, `asdf`.
- **No co-authors.** Single author per commit.
- **No merge commits on feature branches.** Rebase onto `main` before merging.
- **No fixup commits in main history.** Squash before merging if needed.

### Examples

```
feat(server): add long-poll route GET /api/endpoints/:token/wait

feat(mcp): add snag_wait_for_request tool using websockets async long-poll

fix(cli): prevent duplicate token registration on WS reconnect

refactor(server): extract broadcast logic from capture route into ws/hub

docs: add mcp-quickstart.md with uvx config for Claude Code and Cursor

chore(repo): upgrade pnpm to 9.4.0
```

---

## 14. Git Branching

Every piece of work — whether done by a human or an agent — happens on a branch.
Nothing is committed directly to `main`.

### Branch naming

```
{type}/{short-description}

feat/server-capture-route
feat/web-console-page
feat/cli-listen-command
feat/mcp-wait-for-request-tool
feat/sdk-endpoint-class
fix/cli-duplicate-ws-registration
fix/server-body-size-limit
refactor/server-extract-ws-hub
chore/upgrade-pnpm-9
docs/mcp-quickstart
ci/add-python-lint-job
```

Rules:

- `{type}` matches the commit type: `feat`, `fix`, `refactor`, `chore`, `docs`,
  `ci`, `test`
- `{short-description}` is kebab-case, max 40 chars, no slashes
- Include the **scope** in the description when useful:
  `feat/server-capture-route` not just `feat/capture`
- Never use generic names: `feat/changes`, `fix/stuff`, `wip`, `temp`,
  `my-branch`

### One branch per logical unit of work

A logical unit is a coherent, independently reviewable change. Use the Phase
commit plan in `SNAG_PROJECT_PLAN.md` as the guide — each bullet in a phase is
typically one branch + one PR.

```
✅ feat/server-capture-route        → adds /h/:token capture, saves to DB
✅ feat/server-ws-hub               → adds WS hub with register + broadcast
✅ feat/web-console-page            → adds /console/:token page with request list

❌ feat/server-and-web              → too broad, not independently reviewable
❌ feat/phase-1                     → never name a branch after a phase
```

If you realise mid-branch that you need a shared utility, **stop**, create a
separate `feat/` or `refactor/` branch for it, merge that first, then continue.

### Branch lifecycle

```bash
# 1. Always branch from up-to-date main
git checkout main
git pull origin main
git checkout -b feat/server-capture-route

# 2. Work in small, atomic commits (see Section 13)
git add apps/server/src/routes/capture.ts
git commit -m "feat(server): add capture route POST/GET/PUT/PATCH/DELETE /h/:token"

# 3. Keep branch current — rebase, never merge main into your branch
git fetch origin
git rebase origin/main

# 4. Push and open PR
git push origin feat/server-capture-route
# open PR: title mirrors the branch description, body links to relevant phase in plan

# 5. After PR is merged, delete the branch
git branch -d feat/server-capture-route
git push origin --delete feat/server-capture-route
```

### Branch-per-phase strategy

Each phase from `SNAG_PROJECT_PLAN.md` maps to a set of branches. Work through
phases in order. Do not start Phase N+1 branches until all Phase N branches are
merged.

| Phase                | Example branches                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Repo Setup       | `chore/init-monorepo`, `chore/add-eslint-prettier`, `feat/db-prisma-schema`                                                       |
| 1 — Server Core      | `feat/server-fastify-init`, `feat/server-capture-route`, `feat/server-ws-hub`, `feat/server-rest-api`, `feat/server-replay-route` |
| 2 — Web Console      | `feat/web-nextjs-init`, `feat/web-console-page`, `feat/web-ws-hook`, `feat/web-request-detail`, `feat/web-landing-page`           |
| 3 — CLI              | `feat/cli-init`, `feat/cli-tunnel-client`, `feat/cli-listen-command`, `feat/cli-replay-command`                                   |
| 4 — Forwarding Rules | `feat/db-forward-rule-model`, `feat/server-rules-api`, `feat/server-delivery-worker`, `feat/web-rules-page`                       |
| 5 — MCP Server       | `feat/mcp-init`, `feat/mcp-create-endpoint-tool`, `feat/mcp-wait-for-request-tool`, `feat/mcp-remaining-tools`                    |
| 6 — SDK              | `feat/sdk-init`, `feat/sdk-endpoint-class`, `feat/sdk-wait-for-request`, `feat/sdk-publish-config`                                |
| 7 — Auth             | `feat/server-auth-routes`, `feat/web-login-page`, `feat/cli-login-command`                                                        |
| 8 — Polish           | `feat/server-rate-limiting`, `feat/web-diff-viewer`, `docs/readme`, `ci/deploy-workflow`                                          |

### PR rules

- PR title = branch description in sentence case: `feat/server-capture-route` →
  `"Add capture route for /h/:token"`
- PR body must reference the relevant commit(s) from the plan in
  `SNAG_PROJECT_PLAN.md`
- One logical unit per PR — same rule as branches
- PR must pass CI before merge (no exceptions — see Section 22)
- Squash-merge onto `main` to keep history linear; the squash commit message
  should be the conventional commit format from Section 13

### For agents specifically

When an agent (Claude Code, Cursor, Copilot, etc.) is asked to implement a
feature:

1. **Check what branch you're on.** If you are on `main`, create a new branch
   before writing any code.
2. **Name the branch** using the conventions above, scoped to exactly what
   you're implementing.
3. **Commit as you go** — don't accumulate a wall of changes. One atomic commit
   per logical step.
4. **Never push directly to `main`.** If you find yourself on `main` with
   uncommitted changes, stash them, create a branch, then apply the stash.
5. **Check Section 18 (Current Build Status)** before starting — do not
   implement Phase N work if Phase N-1 is not yet merged to main.

```bash
# Agent workflow example
git checkout main && git pull origin main
git checkout -b feat/server-ws-hub

# ... implement ws/hub.ts ...
git add apps/server/src/ws/hub.ts
git commit -m "feat(server): add WebSocket hub with register, broadcast, and cleanup"

# ... implement ws/tunnel.ts ...
git add apps/server/src/ws/tunnel.ts
git commit -m "feat(server): add CLI tunnel protocol handler in ws/tunnel"

git push origin feat/server-ws-hub
# open PR
```

---

## 15. Adding New Features — Decision Guide

### Adding a new REST API route

1. Create a new file in `apps/server/src/routes/api/` if it's a new resource, or
   add to an existing file if it belongs to an existing resource.
2. Define Zod schemas for params, querystring, and body at the top of the
   handler.
3. Register the plugin in `apps/server/src/index.ts`.
4. Add the route to the API Design section of `SNAG_PROJECT_PLAN.md`.
5. Write at least one integration test using `app.inject()`.

### Adding a new WS message type

1. Add the new type to the union in `packages/shared/src/ws-messages.ts`.
2. Handle it in `apps/server/src/ws/hub.ts` (incoming) or add a send helper
   (outgoing).
3. Handle it in `packages/cli/src/tunnel/client.ts` if the CLI needs to react.
4. Handle it in `packages/sdk/src/ws.ts` if the SDK needs to react.
5. Update the WebSocket Protocol section in this file.

### Adding a new MCP tool

1. Create a new file in `packages/mcp/snag_mcp/tools/` named `{tool_name}.py`.
2. Implement the
   `async def snag_{tool_name}(server_url: str, args: dict[str, object]) -> str`
   signature.
3. Register it in `packages/mcp/snag_mcp/server.py` — both in `list_tools()` and
   in `call_tool()`.
4. Write a test in `packages/mcp/tests/test_{tool_name}.py` using `respx` to
   mock the HTTP call.
5. Add the tool definition to Section 10 of `SNAG_PROJECT_PLAN.md`.

### Adding a new database model

1. Add the model to `packages/db/prisma/schema.prisma`.
2. Run `pnpm --filter @snag/db migrate dev --name descriptive_name`.
3. Run `pnpm --filter @snag/db generate` to regenerate the client.
4. Add the corresponding TypeScript type to `packages/shared/src/types.ts`.
5. Never write raw SQL — use the Prisma client exclusively.

### Adding a new React page

1. Create the page at `apps/web/app/{route}/page.tsx`.
2. Server components by default. Add `"use client"` only when state, effects, or
   browser APIs are needed.
3. Data fetching goes in server components via `fetch()` or direct DB access
   (never in client components).
4. WebSocket subscriptions go in a `"use client"` component that is a child of
   the server component.
5. Add corresponding components in `apps/web/components/{route}/` — one file per
   component.

### Adding a new forwarding rule feature

1. Any schema change: add to `packages/db/prisma/schema.prisma`, migrate,
   regenerate client.
2. Server-side: add or modify routes in `apps/server/src/routes/api/rules.ts`.
3. Worker-side: modify `apps/server/src/workers/delivery.ts` for
   evaluation/delivery logic changes.
4. Web UI: add or modify components in `apps/web/components/rules/`.
5. MCP tool: if the change affects `snag_create_forward_rule`, update
   `packages/mcp/snag_mcp/tools/create_forward_rule.py` and its test.
6. Shared types: update `ForwardRule` or `Delivery` in
   `packages/shared/src/types.ts`.

### Adding a new CLI command

1. Create a new file in `packages/cli/src/commands/{command-name}.tsx` (or `.ts`
   if no Ink UI needed).
2. Register it in `packages/cli/src/index.ts` via `program.addCommand(...)`.
3. If it has a terminal UI, build it as an Ink component in
   `packages/cli/src/ui/`.
4. If it produces output that agents might pipe, support `--json` and `--silent`
   flags.

---

## 16. Absolute Prohibitions

These are non-negotiable. If you find yourself about to do any of these, stop
and reconsider the approach.

### Never do these

```
❌ console.log() in apps/server — use req.log or the pino logger
❌ process.env.X directly in route files — use config module
❌ new PrismaClient() outside apps/server/src/lib/db.ts
❌ any barrel file (index.ts that only re-exports)
❌ import from packages/cli inside packages/mcp or packages/sdk
❌ import from packages/mcp inside any TS package (it's Python)
❌ import from apps/* inside packages/* (apps consume packages, not the reverse)
❌ storing secrets in code or committing .env files
❌ JSON.parse() on untrusted input without try/catch
❌ any in TypeScript without a comment explaining why
❌ time.sleep() in Python — use asyncio.sleep()
❌ raise from a tool handler in packages/mcp — return JSON error string instead
❌ cursor pagination on the frontend without a "load more" cap (max 10 pages)
❌ broadcasting to ALL connected clients — always scope to a token room
❌ WIP, fixup, or merge commits in main history
❌ co-author tags in commits
❌ files deeper than 4 directories from repo root
❌ committing directly to main — always use a branch + PR
❌ naming a branch after a phase (feat/phase-1) — name it after the specific work
❌ starting Phase N+1 work before Phase N is fully merged to main
❌ opening a PR that touches more than one logical unit of work
```

❌ broadcasting to ALL connected clients — always scope to a token room ❌ WIP,
fixup, or merge commits in main history ❌ co-author tags in commits ❌ files
deeper than 4 directories from repo root

```

---

## 17. Environment Variables Reference

### apps/server/.env

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase) |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token |
| `PORT` | No | HTTP port (default: 8080) |
| `NODE_ENV` | No | `development` / `production` / `test` |
| `RESEND_API_KEY` | Phase 7+ | Resend API key for magic link emails |
| `MAGIC_LINK_SECRET` | Phase 7+ | 32-char random string for signing magic links |
| `SESSION_SECRET` | Phase 7+ | 32-char random string for session cookies |
| `PUBLIC_APP_URL` | Phase 7+ | e.g. `https://snag.vercel.app` |

### apps/web/.env.local

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SERVER_URL` | Yes | e.g. `https://snag-server.fly.dev` |
| `NEXT_PUBLIC_WS_URL` | Yes | e.g. `wss://snag-server.fly.dev/ws` |

### packages/cli (~/.snag/config.json)

Not an .env file. Written and read by the CLI itself.

| Key | Description |
|---|---|
| `serverUrl` | Snag server base URL (default: `https://snag-server.fly.dev`) |
| `token` | Persistent endpoint token (persisted after first run) |
| `authToken` | Session token (null until `snag login`) |

### packages/mcp (env at agent spawn time)

| Variable | Required | Description |
|---|---|---|
| `SNAG_SERVER_URL` | No | Override server URL (default: `https://snag-server.fly.dev`) |
| `SNAG_AUTH_TOKEN` | No | Auth token for authenticated endpoints (Phase 7+) |

---

## 18. Current Build Status

Track which phases are complete. Update this section as work is merged to `main`.

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Repo Setup | ☐ Not started | |
| Phase 1 — Server Core | ☐ Not started | |
| Phase 2 — Web Console | ☐ Not started | |
| Phase 3 — CLI | ☐ Not started | |
| Phase 4 — Forwarding Rules | ☐ Not started | |
| Phase 5 — MCP Server | ☐ Not started | |
| Phase 6 — SDK | ☐ Not started | |
| Phase 7 — Auth | ☐ Not started | |
| Phase 8 — Polish & Deploy | ☐ Not started | |

**Legend:** ☐ Not started · ⚙ In progress · ✅ Complete

---

## 19. Dependency Rules

### Who can import whom

```

apps/web → packages/shared, packages/sdk apps/server → packages/shared,
packages/db packages/cli → packages/shared packages/sdk → packages/shared
packages/mcp → (Python — no TS imports; talks to server via HTTP/WS only)
packages/shared → (no internal deps — leaf node) packages/db → (no internal deps
— Prisma only)

````

Visualised as a graph: `apps` depend on `packages`. `packages` depend only on `shared` or `db`. Nothing depends on `apps`. `packages/mcp` is completely isolated.

### Adding a new npm dependency

Before adding any new package, answer:

1. **Is it in active maintenance?** Check last commit date and open issues.
2. **What is its install size?** Run `npx pkg-size <package>` — avoid anything over 500kB for `packages/sdk` (browser-compatible).
3. **Does `packages/sdk` need it?** If yes, it must have zero native bindings and be browser-compatible.
4. **Is there a lighter alternative?** e.g. prefer `ms` over `moment`, `zod` over `joi`, `pino` over `winston`.

### Adding a new Python dependency

```bash
cd packages/mcp
uv add <package>           # adds to pyproject.toml and updates uv.lock
uv add --dev <package>     # dev/test only
````

Never manually edit `uv.lock`. Always use `uv add` / `uv remove`.

---

## 20. Error Handling Patterns

### Server route errors

```typescript
// Fastify error handler registered in apps/server/src/index.ts
fastify.setErrorHandler((error, req, reply) => {
  if (error instanceof ZodError) {
    return reply
      .status(422)
      .send({ error: 'Validation failed', details: error.flatten() });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return reply.status(404).send({ error: 'Record not found' });
    }
  }
  req.log.error({ err: error }, 'unhandled route error');
  return reply.status(500).send({ error: 'Internal server error' });
});
```

### WS message errors

Never crash the WS connection on a bad message. Send an error message and
continue.

```typescript
ws.on('message', (raw) => {
  const parseResult = clientMessageSchema.safeParse(JSON.parse(raw.toString()));
  if (!parseResult.success) {
    ws.send(
      JSON.stringify({ type: 'error', message: 'Invalid message format' }),
    );
    return; // continue, don't close
  }
  handleMessage(ws, parseResult.data);
});
```

### BullMQ worker errors

Workers log errors and rely on BullMQ's built-in retry with exponential backoff.
Never swallow errors silently.

```typescript
worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'delivery job failed');
  // BullMQ handles retry — no manual retry logic here
});
```

### Python MCP tool errors

```python
# Every tool handler wraps its logic in try/except
# and returns a JSON error string — never raises
async def snag_replay_request(server_url: str, args: dict[str, object]) -> str:
    try:
        # ... implementation
    except httpx.HTTPStatusError as e:
        return json.dumps({"error": f"Upstream returned {e.response.status_code}"})
    except httpx.RequestError as e:
        return json.dumps({"error": f"Network error: {e}"})
    except Exception as e:
        return json.dumps({"error": f"Unexpected error: {e}"})
```

---

## 21. Key Data Types

Defined in `packages/shared/src/types.ts`. These are the canonical shapes used
across all packages.

```typescript
export interface Endpoint {
  id: string;
  token: string;
  label: string | null;
  userId: string | null;
  createdAt: string; // ISO 8601
  expiresAt: string | null;
}

export interface CapturedRequest {
  id: string;
  endpointId: string;
  method: string; // "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string;
  headers: Record<string, string>;
  body: string | null; // raw body string
  bodyType: 'json' | 'form' | 'raw' | null;
  query: Record<string, string>;
  sourceIp: string | null;
  latencyMs: number | null; // null until forwarded
  status: number | null; // HTTP status from your server, null if not forwarded
  receivedAt: string; // ISO 8601
}

export interface Replay {
  id: string;
  requestId: string;
  targetUrl: string;
  status: number | null;
  latencyMs: number | null;
  responseBody: string | null;
  createdAt: string;
}

export interface ForwardRule {
  id: string;
  endpointId: string;
  name: string | null;
  enabled: boolean;
  filterMethod: string | null; // null = match any method
  filterBodyKey: string | null; // null = match any body
  filterBodyVal: string | null; // null = key just needs to exist
  destinationUrl: string;
  retries: number; // 0 | 3 | 5
  createdAt: string;
}

export interface Delivery {
  id: string;
  ruleId: string;
  requestId: string;
  targetUrl: string;
  status: number | null;
  attempt: number;
  error: string | null;
  createdAt: string;
}
```

---

## 22. CI Behaviour

### On every pull request

```yaml
# .github/workflows/ci.yml triggers on: [pull_request]
1. pnpm install --frozen-lockfile
2. pnpm turbo typecheck          # all TS packages in parallel
3. pnpm turbo lint               # eslint on all TS packages
4. pnpm turbo test               # vitest on all TS packages
5. cd packages/mcp && uv sync && uv run ruff check . && uv run mypy snag_mcp/ && uv run pytest
```

**A PR cannot be merged if CI fails.** No exceptions.

### On merge to main

```yaml
# .github/workflows/deploy.yml triggers on: push to main
1. Run CI steps above 2. Deploy apps/server to Fly.io via flyctl 3. Deploy
apps/web to Vercel (auto-triggered by Vercel GitHub integration)
```

### On version tag (vX.Y.Z)

```yaml
# .github/workflows/publish.yml triggers on: push tags v*
1. Publish packages/cli to npm as snag-cli 2. Publish packages/sdk to npm as
@snag/sdk 3. Publish packages/mcp to PyPI as snag-mcp (via uv build + twine)
```

### Turbo task graph

```json
// turbo.json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "test": { "dependsOn": ["^build"] },
    "dev": { "persistent": true, "dependsOn": ["^build"] }
  }
}
```

`packages/db` and `packages/shared` must build before any package that depends
on them. Turbo handles this via `^build` dependency resolution.

---

_This file should be updated whenever a new convention is established, a new
package is added, or a phase is completed. It is the single source of truth for
agent behaviour in this codebase._
