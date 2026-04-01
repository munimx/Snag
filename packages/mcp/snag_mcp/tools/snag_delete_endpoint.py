from __future__ import annotations

import json

import httpx

from snag_mcp.client import SnagClient, error_json, ok_json


async def snag_delete_endpoint(server_url: str, args: dict[str, object], auth_token: str | None) -> str:
    token = args.get("token")
    if not isinstance(token, str) or token == "":
        return error_json("token is required", kind="validation")
    try:
        result = await SnagClient(server_url, auth_token=auth_token).delete_endpoint(token=token)
        return ok_json(result)
    except httpx.HTTPStatusError as exc:
        return error_json(f"HTTP {exc.response.status_code}: {exc.response.text}", kind="http")
    except httpx.RequestError as exc:
        return error_json(f"Network error: {exc}", kind="network")
    except Exception as exc:
        return json.dumps({"error": str(exc), "kind": "unexpected"})
