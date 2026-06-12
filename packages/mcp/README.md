# snag-mcp

Python MCP server for Snag.

## Local usage

```bash
uv sync
SNAG_SERVER_URL=http://localhost:8080 uv run snag-mcp
```

See [`../../docs/mcp-quickstart.md`](../../docs/mcp-quickstart.md) for client
configuration and tool examples.

## Development

```bash
uv sync
uv run snag-mcp
uv run ruff check .
uv run mypy snag_mcp/
uv run pytest
```
