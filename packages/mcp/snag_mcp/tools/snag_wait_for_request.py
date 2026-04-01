from __future__ import annotations

import asyncio
import json

import httpx
import websockets
from websockets.exceptions import WebSocketException

from snag_mcp.client import SnagClient, error_json


async def _ws_wait(server_url: str, token: str, timeout_seconds: float) -> str | None:
    ws_url = (
        server_url.replace("https://", "wss://")
        .replace("http://", "ws://")
        .rstrip("/")
        + "/ws"
    )
    async with websockets.connect(ws_url) as websocket:
        await websocket.send(
            json.dumps({"type": "register", "token": token, "clientType": "sdk"})
        )
        await websocket.recv()
        while True:
            raw_message = await asyncio.wait_for(websocket.recv(), timeout=timeout_seconds)
            payload = json.loads(raw_message)
            if isinstance(payload, dict) and payload.get("type") == "request_captured":
                request = payload.get("request")
                if isinstance(request, dict):
                    request_id = request.get("id")
                    if isinstance(request_id, str):
                        return request_id


async def snag_wait_for_request(
    server_url: str,
    args: dict[str, object],
    auth_token: str | None,
) -> str:
    token = args.get("token")
    if not isinstance(token, str) or token == "":
        return error_json("token is required", kind="validation")
    timeout_ms = args.get("timeoutMs", 30_000)
    if not isinstance(timeout_ms, int) or timeout_ms <= 0:
        return error_json("timeoutMs must be a positive integer", kind="validation")

    try:
        request_from_http = await SnagClient(
            server_url,
            auth_token=auth_token,
        ).wait_for_request(token=token)
        if request_from_http is not None:
            return request_from_http.model_dump_json()

        request_id = await _ws_wait(server_url, token, timeout_seconds=timeout_ms / 1000)
        if request_id is None:
            return json.dumps({"ok": False, "request": None})
        request = await SnagClient(
            server_url,
            auth_token=auth_token,
        ).get_request(request_id=request_id)
        return request.model_dump_json()
    except TimeoutError:
        return json.dumps({"ok": False, "request": None})
    except httpx.HTTPStatusError as exc:
        return error_json(f"HTTP {exc.response.status_code}: {exc.response.text}", kind="http")
    except httpx.RequestError as exc:
        return error_json(f"Network error: {exc}", kind="network")
    except WebSocketException as exc:
        return error_json(f"WebSocket error: {exc}", kind="network")
    except Exception as exc:
        return json.dumps({"error": str(exc), "kind": "unexpected"})
