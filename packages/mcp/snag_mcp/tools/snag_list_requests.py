from __future__ import annotations

import json

import httpx

from snag_mcp.client import SnagClient, error_json


async def snag_list_requests(
    server_url: str,
    args: dict[str, object],
    auth_token: str | None,
) -> str:
    token = args.get("token")
    if not isinstance(token, str) or token == "":
        return error_json("token is required", kind="validation")

    limit = args.get("limit", 50)
    cursor = args.get("cursor")
    method = args.get("method")
    search = args.get("search")
    if not isinstance(limit, int):
        return error_json("limit must be an integer", kind="validation")
    if cursor is not None and not isinstance(cursor, str):
        return error_json("cursor must be a string", kind="validation")
    if method is not None and not isinstance(method, str):
        return error_json("method must be a string", kind="validation")
    if search is not None and not isinstance(search, str):
        return error_json("search must be a string", kind="validation")

    try:
        result = await SnagClient(server_url, auth_token=auth_token).list_requests(
            token=token,
            limit=limit,
            cursor=cursor,
            method=method,
            search=search,
        )
        return result.model_dump_json()
    except httpx.HTTPStatusError as exc:
        return error_json(f"HTTP {exc.response.status_code}: {exc.response.text}", kind="http")
    except httpx.RequestError as exc:
        return error_json(f"Network error: {exc}", kind="network")
    except Exception as exc:
        return json.dumps({"error": str(exc), "kind": "unexpected"})
