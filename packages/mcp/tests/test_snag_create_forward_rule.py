from __future__ import annotations

import json

import httpx
import pytest
import respx

from snag_mcp.tools.snag_create_forward_rule import snag_create_forward_rule


@pytest.mark.asyncio
async def test_snag_create_forward_rule_returns_rule() -> None:
    with respx.mock(assert_all_called=True) as respx_mock:
        route = respx_mock.post("http://localhost:8080/api/endpoints/tok_1/rules").mock(
            return_value=httpx.Response(
                201,
                json={
                    "id": "rule_1",
                    "endpointId": "ep_1",
                    "name": "to-local",
                    "enabled": True,
                    "filterMethod": "POST",
                    "filterBodyKey": "event",
                    "filterBodyVal": "order.created",
                    "destinationUrl": "http://localhost:3000",
                    "retries": 3,
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
                "method": "POST",
                "bodyKey": "event",
                "bodyValue": "order.created",
            },
            None,
        )
    parsed = json.loads(result)
    assert parsed["id"] == "rule_1"
    assert parsed["destinationUrl"] == "http://localhost:3000"

    sent_payload = json.loads(route.calls[0].request.content.decode("utf-8"))
    assert sent_payload == {
        "name": "to-local",
        "enabled": True,
        "destinationUrl": "http://localhost:3000",
        "filterMethod": "POST",
        "filterBodyKey": "event",
        "filterBodyVal": "order.created",
    }
