from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from snag_mcp.config import get_auth_token, get_server_url
from snag_mcp.registry import TOOL_HANDLERS

app = FastMCP("snag-mcp")


async def _call(name: str, arguments: dict[str, object]) -> str:
    handler = TOOL_HANDLERS.get(name)
    if handler is None:
        return '{"error":"Unknown tool"}'
    return await handler(get_server_url(), arguments, get_auth_token())


@app.tool(
    name="snag_create_endpoint",
    description="Create a new Snag endpoint and return token/url.",
)
async def tool_snag_create_endpoint(label: str | None = None) -> str:
    return await _call("snag_create_endpoint", {"label": label} if label is not None else {})


@app.tool(name="snag_delete_endpoint", description="Delete an endpoint by token.")
async def tool_snag_delete_endpoint(token: str) -> str:
    return await _call("snag_delete_endpoint", {"token": token})


@app.tool(name="snag_list_requests", description="List captured requests for an endpoint token.")
async def tool_snag_list_requests(
    token: str,
    limit: int = 50,
    cursor: str | None = None,
    method: str | None = None,
    search: str | None = None,
) -> str:
    return await _call(
        "snag_list_requests",
        {
            "token": token,
            "limit": limit,
            "cursor": cursor,
            "method": method,
            "search": search,
        },
    )


@app.tool(name="snag_get_request", description="Get one captured request by id.")
async def tool_snag_get_request(id: str) -> str:  # noqa: A002
    return await _call("snag_get_request", {"id": id})


@app.tool(name="snag_replay_request", description="Replay a captured request to a target URL.")
async def tool_snag_replay_request(id: str, targetUrl: str) -> str:  # noqa: N803, A002
    return await _call("snag_replay_request", {"id": id, "targetUrl": targetUrl})


@app.tool(
    name="snag_wait_for_request",
    description="Wait for the next request for an endpoint token.",
)
async def tool_snag_wait_for_request(token: str, timeoutMs: int = 30000) -> str:  # noqa: N803
    return await _call("snag_wait_for_request", {"token": token, "timeoutMs": timeoutMs})


@app.tool(name="snag_create_forward_rule", description="Create a forward rule on an endpoint.")
async def tool_snag_create_forward_rule(
    token: str,
    name: str,
    destinationUrl: str,  # noqa: N803
    method: str | None = None,
    bodyKey: str | None = None,  # noqa: N803
    bodyValue: str | None = None,  # noqa: N803
) -> str:
    return await _call(
        "snag_create_forward_rule",
        {
            "token": token,
            "name": name,
            "destinationUrl": destinationUrl,
            "method": method,
            "bodyKey": bodyKey,
            "bodyValue": bodyValue,
        },
    )
