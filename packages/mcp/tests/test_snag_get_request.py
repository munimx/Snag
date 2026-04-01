from __future__ import annotations

import json

import httpx
import pytest
import respx

from snag_mcp.tools.snag_get_request import snag_get_request


@pytest.mark.asyncio
async def test_snag_get_request_returns_request() -> None:
    with respx.mock(assert_all_called=True) as respx_mock:
        respx_mock.get("http://localhost:8080/api/requests/req_1").mock(
            return_value=httpx.Response(
                200,
                json={
                    "id": "req_1",
                    "endpointId": "ep_1",
                    "method": "POST",
                    "path": "/hooks",
                    "query": {},
                    "headers": {},
                    "body": "{}",
                    "bodyType": "json",
                    "status": 200,
                    "latencyMs": 12,
                    "receivedAt": "2024-01-01T00:00:00.000Z",
                },
            )
        )
        result = await snag_get_request("http://localhost:8080", {"id": "req_1"}, None)
    parsed = json.loads(result)
    assert parsed["id"] == "req_1"
