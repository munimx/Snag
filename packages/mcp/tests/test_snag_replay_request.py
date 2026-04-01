from __future__ import annotations

import json

import httpx
import pytest
import respx

from snag_mcp.tools.snag_replay_request import snag_replay_request


@pytest.mark.asyncio
async def test_snag_replay_request_returns_replay_data() -> None:
    with respx.mock(assert_all_called=True) as respx_mock:
        respx_mock.post("http://localhost:8080/api/requests/req_1/replay").mock(
            return_value=httpx.Response(
                200,
                json={
                    "id": "rep_1",
                    "targetUrl": "https://example.com/webhook",
                    "responseStatus": 200,
                    "latencyMs": 15,
                    "createdAt": "2024-01-01T00:00:00.000Z",
                },
            )
        )
        result = await snag_replay_request(
            "http://localhost:8080",
            {"id": "req_1", "targetUrl": "https://example.com/webhook"},
            None,
        )
    parsed = json.loads(result)
    assert parsed["id"] == "rep_1"
