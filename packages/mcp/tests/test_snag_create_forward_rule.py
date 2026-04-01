from __future__ import annotations

import json

import httpx
import pytest
import respx

from snag_mcp.tools.snag_create_forward_rule import snag_create_forward_rule


@pytest.mark.asyncio
async def test_snag_create_forward_rule_returns_flow() -> None:
    with respx.mock(assert_all_called=True) as respx_mock:
        respx_mock.post("http://localhost:8080/api/endpoints/tok_1/flows").mock(
            return_value=httpx.Response(
                201,
                json={
                    "id": "flow_1",
                    "endpointId": "ep_1",
                    "name": "to-local",
                    "isEnabled": True,
                    "config": {"destinationUrl": "http://localhost:3000"},
                    "createdAt": "2024-01-01T00:00:00.000Z",
                    "updatedAt": "2024-01-01T00:00:00.000Z",
                },
            )
        )
        result = await snag_create_forward_rule(
            "http://localhost:8080",
            {
                "token": "tok_1",
                "name": "to-local",
                "destinationUrl": "http://localhost:3000",
            },
            None,
        )
    parsed = json.loads(result)
    assert parsed["id"] == "flow_1"
