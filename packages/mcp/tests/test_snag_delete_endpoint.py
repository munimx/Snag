from __future__ import annotations

import json

import httpx
import pytest
import respx

from snag_mcp.tools.snag_delete_endpoint import snag_delete_endpoint


@pytest.mark.asyncio
async def test_snag_delete_endpoint_returns_ok() -> None:
    with respx.mock(assert_all_called=True) as respx_mock:
        respx_mock.delete("http://localhost:8080/api/endpoints/abc123").mock(
            return_value=httpx.Response(204)
        )
        result = await snag_delete_endpoint("http://localhost:8080", {"token": "abc123"}, None)
    parsed = json.loads(result)
    assert parsed["ok"] is True
