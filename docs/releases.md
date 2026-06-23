# Release Notes

## Current Public Packages

| Package | Registry | Status |
| --- | --- | --- |
| `snag-cli` | npm | Published as `0.0.4` |
| `@snag/sdk` | npm | Prepared in-repo as `0.1.0`; publish blocked until npm `@snag` scope access is available |
| `snag-mcp` | PyPI | Published as `0.1.2`; `uvx` install/import smoke verified |

## Install Flows to Verify Before Each Release

### CLI

```bash
npx snag-cli --version
npx snag-cli listen 3000
```

Expected: prints a hosted URL under `https://snag-server.fly.dev/h/<token>` and
streams captured requests to the terminal.

### SDK

```bash
pnpm add @snag/sdk
```

Current blocker: npm rejected `@snag/sdk@0.1.0` with a scope permission error.
Create/grant access to the npm `@snag` scope, then retry `npm publish --access
public` from `packages/sdk`.

Expected:

```ts
import { SnagClient } from '@snag/sdk';

const client = new SnagClient();
const endpoint = await client.createEndpoint();
console.log(endpoint.url);
```

### MCP

```bash
uvx snag-mcp
```

Expected: starts an MCP stdio server that defaults to
`https://snag-server.fly.dev`.

## Release Checklist

1. Update package version and package README.
2. Run package build, typecheck, lint, and tests.
3. Run a packed install smoke test in a temporary project.
4. Publish with the correct access level.
5. Verify the registry metadata and install path.
6. Add a changelog entry and PR comment with validation evidence.
