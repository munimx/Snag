# MCP Quickstart (Stub)

This stub exists for Phase 5 and will be expanded with full agent-specific setup.

## Run locally

```bash
cd packages/mcp
uv sync
uv run snag-mcp
```

## Expected environment

- `SNAG_SERVER_URL` (optional, defaults to deployed Snag server)

## Available tools

- `snag_create_endpoint`
- `snag_delete_endpoint`
- `snag_list_requests`
- `snag_get_request`
- `snag_replay_request`
- `snag_wait_for_request`
- `snag_create_forward_rule`
