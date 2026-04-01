from __future__ import annotations

import json

import httpx
import pytest
import respx

from snag_mcp.tools.snag_list_requests import snag_list_requests


@pytest.mark.asyncio
async def test_snag_list_requests_returns_data_and_meta() -> None:
    with respx.mock(assert_all_called=True) as respx_mock:
        respx_mock.get("http://localhost:8080/api/endpoints/tok_1/requests").mock(
            return_value=httpx.Response(
                200,
                json={
                    "data": [
                        {
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
                        }
                    ],
                    "meta": {"total": 1, "limit": 50, "nextCursor": None, "hasMore": False},
                },
            )
        )
        result = await snag_list_requests("http://localhost:8080", {"token": "tok_1"}, None)
    parsed = json.loads(result)
    assert parsed["meta"]["total"] == 1
