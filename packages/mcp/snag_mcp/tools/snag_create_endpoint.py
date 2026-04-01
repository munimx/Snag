from __future__ import annotations

import json

import httpx

from snag_mcp.client import SnagClient, error_json


async def snag_create_endpoint(server_url: str, args: dict[str, object], auth_token: str | None) -> str:
    try:
        label = args.get("label")
        label_value = str(label) if isinstance(label, str) else None
        result = await SnagClient(server_url, auth_token=auth_token).create_endpoint(label=label_value)
        return result.model_dump_json()
    except httpx.HTTPStatusError as exc:
        return error_json(f"HTTP {exc.response.status_code}: {exc.response.text}", kind="http")
    except httpx.RequestError as exc:
        return error_json(f"Network error: {exc}", kind="network")
    except Exception as exc:
        return json.dumps({"error": str(exc), "kind": "unexpected"})
