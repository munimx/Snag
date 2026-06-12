# MCP Quickstart

`snag-mcp` lets MCP-compatible agents create webhook endpoints, wait for real
requests, inspect payloads, replay events, and clean up after a debugging
session.

## Run Locally

Start the Snag API server first:

```bash
docker compose up server firestore redis
```

Then run the MCP package:

```bash
cd packages/mcp
uv sync
SNAG_SERVER_URL=http://localhost:8080 uv run snag-mcp
```

For a published install, point your MCP client at:

```bash
uvx snag-mcp
```

## Client Config

Use the same command shape in any MCP client that supports stdio servers:

```json
{
  "mcpServers": {
    "snag": {
      "command": "uvx",
      "args": ["snag-mcp"],
      "env": {
        "SNAG_SERVER_URL": "http://localhost:8080"
      }
    }
  }
}
```

For a deployed Snag server, change `SNAG_SERVER_URL` to your public API origin.
If auth is enabled and required for your workflow, also set `SNAG_AUTH_TOKEN`.

## Available Tools

- `snag_create_endpoint`: create a capture endpoint and return `{ token, url }`
- `snag_wait_for_request`: block until the next request arrives for a token
- `snag_list_requests`: list recent captured requests for a token
- `snag_get_request`: fetch one captured request by id
- `snag_replay_request`: replay a captured request to a target URL
- `snag_create_forward_rule`: create a forwarding rule for an endpoint
- `snag_delete_endpoint`: delete an endpoint and its captured requests

## Example Agent Flow

1. Call `snag_create_endpoint` with a label like `stripe-dev`.
2. Send a webhook to the returned URL.
3. Call `snag_wait_for_request` with the returned token.
4. Use the real payload to build or debug the webhook handler.
5. Call `snag_delete_endpoint` when the session is done.

## Development Checks

```bash
cd packages/mcp
uv run ruff check .
uv run mypy snag_mcp/
uv run pytest
```
