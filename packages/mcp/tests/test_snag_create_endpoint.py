from __future__ import annotations

import json

import httpx
import pytest
import respx

from snag_mcp.tools.snag_create_endpoint import snag_create_endpoint


@pytest.mark.asyncio
async def test_snag_create_endpoint_returns_endpoint_json() -> None:
    with respx.mock(assert_all_called=True) as respx_mock:
        respx_mock.post("http://localhost:8080/api/endpoints").mock(
            return_value=httpx.Response(
                201,
                json={
                    "id": "ep_1",
                    "token": "abc123",
                    "label": "test",
                    "url": "http://localhost:8080/h/abc123",
                },
            )
        )
        result = await snag_create_endpoint(
            "http://localhost:8080",
            {"label": "test"},
            None,
        )
    parsed = json.loads(result)
    assert parsed["token"] == "abc123"
