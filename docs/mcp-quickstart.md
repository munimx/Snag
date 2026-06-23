# MCP Quickstart

`snag-mcp` lets MCP-compatible agents create webhook endpoints, wait for real
requests, inspect payloads, replay events, and clean up after a debugging
session.

## Hosted Quickstart

For a published install, point your MCP client at:

```bash
uvx snag-mcp
```

By default, `snag-mcp` talks to `https://snag-server.fly.dev`.

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

## Client Config

Use the same command shape in any MCP client that supports stdio servers:

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

For local or self-hosted Snag, set `SNAG_SERVER_URL` to your API origin. If
auth is enabled and required for your workflow, also set `SNAG_AUTH_TOKEN`.

## Agent Setup Notes

Use the stdio server command below in Claude Code, Cursor, Copilot-compatible
MCP hosts, Codex, or any client that accepts an MCP command plus args:

```text
command: uvx
args: snag-mcp
```

For local Snag:

```text
command: uvx
args: snag-mcp
env:
  SNAG_SERVER_URL: http://localhost:8080
```

Keep the hosted default for shared debugging sessions so the agent can create a
public capture URL that provider dashboards can reach.

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

## Agent Workflow Recipes

- **Wait for Stripe webhook:** create an endpoint, paste the returned URL into
  Stripe test webhooks, trigger `checkout.session.completed`, then call
  `snag_wait_for_request`.
- **Inspect latest failed webhook:** call `snag_list_requests` for the endpoint,
  pick the newest request with a `4xx` or `5xx` status, then call
  `snag_get_request` to inspect headers and body.
- **Replay this request:** call `snag_replay_request` with the captured request
  id and your local handler URL, then inspect the returned status and latency.
- **Create a repro for a teammate:** call `snag_get_request`, summarize the
  relevant headers/body, then ask the agent to turn the payload into a focused
  unit test or cURL command.
- **Clean up an agent session:** call `snag_delete_endpoint` after temporary
  debugging endpoints are no longer needed.

## Development Checks

```bash
cd packages/mcp
uv run ruff check .
uv run mypy snag_mcp/
uv run pytest
```
