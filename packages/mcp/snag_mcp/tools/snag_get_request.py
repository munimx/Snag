from __future__ import annotations

import json

import httpx

from snag_mcp.client import SnagClient, error_json


async def snag_get_request(server_url: str, args: dict[str, object], auth_token: str | None) -> str:
    request_id = args.get("id")
    if not isinstance(request_id, str) or request_id == "":
        return error_json("id is required", kind="validation")
    try:
        result = await SnagClient(server_url, auth_token=auth_token).get_request(request_id=request_id)
        return result.model_dump_json()
    except httpx.HTTPStatusError as exc:
        return error_json(f"HTTP {exc.response.status_code}: {exc.response.text}", kind="http")
    except httpx.RequestError as exc:
        return error_json(f"Network error: {exc}", kind="network")
    except Exception as exc:
        return json.dumps({"error": str(exc), "kind": "unexpected"})
