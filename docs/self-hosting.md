# Self-Hosting Snag

This guide runs Snag server + web with Firebase Firestore and Redis. For local
development, the included Docker Compose stack starts a Firestore emulator so
you can use the product without creating a Firebase project first.

## Quick Start

```bash
docker compose up --build
```

Open `http://localhost:3000`, create an endpoint, and send a request to
`http://localhost:8080/h/<token>`.

## Environment

Docker Compose has working local defaults, so `.env` is optional. Copy
[.env.example](../.env.example) to `.env` only when you want to override ports,
limits, or Firebase/Redis settings.

For pnpm-based local development, use the package examples instead:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

Then start the Firestore emulator in another terminal:

```bash
firebase emulators:start --only firestore
```

The Next.js app reads `apps/web/.env.local` automatically. The Fastify server
does not load `.env` files on its own, so export the server env before starting
it:

```bash
set -a
source apps/server/.env
set +a
pnpm --filter @snag/server dev
```

`ENABLE_DELIVERY_WORKER=false` is the recommended local default when you only
need capture, history, replay, CLI, SDK, and MCP flows. Set it to `true` and run
Redis when testing forwarding-rule background delivery.

## Production Firebase

For production, remove `FIRESTORE_EMULATOR_HOST` and set one of:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_SERVICE_ACCOUNT_PATH`
- Google application-default credentials in the runtime environment

Set `FIREBASE_PROJECT_ID` to your Firebase project id.

## CI/CD Notes

- PR/main checks: `.github/workflows/ci.yml`
- Fly deploy on `main`: `.github/workflows/deploy.yml`
- npm/PyPI publish on package tags: `.github/workflows/publish.yml`
  (`cli-v*`, `sdk-v*`, `mcp-v*`)
