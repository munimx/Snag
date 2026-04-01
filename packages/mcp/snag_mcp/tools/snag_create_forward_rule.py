from __future__ import annotations

import json

import httpx

from snag_mcp.client import SnagClient, error_json


async def snag_create_forward_rule(server_url: str, args: dict[str, object], auth_token: str | None) -> str:
    token = args.get("token")
    name = args.get("name")
    destination_url = args.get("destinationUrl")
    method = args.get("method")
    body_key = args.get("bodyKey")
    body_value = args.get("bodyValue")

    if not isinstance(token, str) or token == "":
        return error_json("token is required", kind="validation")
    if not isinstance(name, str) or name == "":
        return error_json("name is required", kind="validation")
    if not isinstance(destination_url, str) or destination_url == "":
        return error_json("destinationUrl is required", kind="validation")
    if method is not None and not isinstance(method, str):
        return error_json("method must be a string", kind="validation")
    if body_key is not None and not isinstance(body_key, str):
        return error_json("bodyKey must be a string", kind="validation")
    if body_value is not None and not isinstance(body_value, str):
        return error_json("bodyValue must be a string", kind="validation")

    try:
        result = await SnagClient(server_url, auth_token=auth_token).create_forward_rule(
            token=token,
            name=name,
            destination_url=destination_url,
            method=method,
            body_key=body_key,
            body_value=body_value,
        )
        return result.model_dump_json()
    except httpx.HTTPStatusError as exc:
        return error_json(f"HTTP {exc.response.status_code}: {exc.response.text}", kind="http")
    except httpx.RequestError as exc:
        return error_json(f"Network error: {exc}", kind="network")
    except Exception as exc:
        return json.dumps({"error": str(exc), "kind": "unexpected"})
