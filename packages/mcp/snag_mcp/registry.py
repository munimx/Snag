from __future__ import annotations

from collections.abc import Awaitable, Callable

from snag_mcp.tools import (
    snag_create_endpoint,
    snag_create_forward_rule,
    snag_delete_endpoint,
    snag_get_request,
    snag_list_requests,
    snag_replay_request,
    snag_wait_for_request,
)

ToolHandler = Callable[[str, dict[str, object], str | None], Awaitable[str]]

TOOL_HANDLERS: dict[str, ToolHandler] = {
    "snag_create_endpoint": snag_create_endpoint,
    "snag_delete_endpoint": snag_delete_endpoint,
    "snag_list_requests": snag_list_requests,
    "snag_get_request": snag_get_request,
    "snag_replay_request": snag_replay_request,
    "snag_wait_for_request": snag_wait_for_request,
    "snag_create_forward_rule": snag_create_forward_rule,
}
