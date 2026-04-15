from __future__ import annotations

import json
from typing import Literal

import httpx

from snag_mcp.models import CapturedRequest, Endpoint, Flow, ReplayResponse, RequestListResponse


class SnagClient:
    def __init__(self, server_url: str, auth_token: str | None = None) -> None:
        self._server_url = server_url.rstrip("/")
        self._timeout = httpx.Timeout(30.0)
        self._auth_token = auth_token

    def _headers(self) -> dict[str, str] | None:
        if self._auth_token is None:
            return None
        return {"authorization": f"Bearer {self._auth_token}"}

    async def create_endpoint(self, label: str | None = None) -> Endpoint:
        payload: dict[str, object] = {}
        if label is not None:
            payload["label"] = label
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                f"{self._server_url}/api/endpoints",
                json=payload,
                headers=self._headers(),
            )
            response.raise_for_status()
            return Endpoint.model_validate(response.json())

    async def delete_endpoint(self, token: str) -> dict[str, object]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.delete(
                f"{self._server_url}/api/endpoints/{token}",
                headers=self._headers(),
            )
            response.raise_for_status()
            if response.status_code == 204:
                return {"ok": True}
            return self._as_json_dict(response)

    async def list_requests(
        self,
        token: str,
        limit: int = 50,
        cursor: str | None = None,
        method: str | None = None,
        search: str | None = None,
    ) -> RequestListResponse:
        params: dict[str, str | int] = {"limit": limit}
        if cursor is not None:
            params["cursor"] = cursor
        if method is not None:
            params["method"] = method
        if search is not None:
            params["search"] = search
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(
                f"{self._server_url}/api/endpoints/{token}/requests",
                params=params,
                headers=self._headers(),
            )
            response.raise_for_status()
            return RequestListResponse.model_validate(response.json())

    async def get_request(self, request_id: str) -> CapturedRequest:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(
                f"{self._server_url}/api/requests/{request_id}",
                headers=self._headers(),
            )
            response.raise_for_status()
            return CapturedRequest.model_validate(response.json())

    async def replay_request(self, request_id: str, target_url: str) -> ReplayResponse:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                f"{self._server_url}/api/requests/{request_id}/replay",
                json={"targetUrl": target_url},
                headers=self._headers(),
            )
            response.raise_for_status()
            return ReplayResponse.model_validate(response.json())

    async def wait_for_request(self, token: str) -> CapturedRequest | None:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(
                f"{self._server_url}/api/endpoints/{token}/wait",
                headers=self._headers(),
            )
            if response.status_code == 204:
                return None
            response.raise_for_status()
            return CapturedRequest.model_validate(response.json())

    async def create_forward_rule(
        self,
        token: str,
        name: str,
        destination_url: str,
        method: str | None = None,
        body_key: str | None = None,
        body_value: str | None = None,
    ) -> Flow:
        payload: dict[str, object] = {
            "name": name,
            "enabled": True,
            "destinationUrl": destination_url,
        }
        if method is not None:
            payload["filterMethod"] = method
        if body_key is not None:
            payload["filterBodyKey"] = body_key
        if body_value is not None:
            payload["filterBodyVal"] = body_value

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                f"{self._server_url}/api/endpoints/{token}/rules",
                json=payload,
                headers=self._headers(),
            )
            response.raise_for_status()
            return Flow.model_validate(response.json())

    @staticmethod
    def _as_json_dict(response: httpx.Response) -> dict[str, object]:
        data = response.json()
        if isinstance(data, dict):
            return data
        raise ValueError("Expected JSON object response")


def ok_json(payload: dict[str, object]) -> str:
    return json.dumps(payload)


def error_json(
    message: str,
    kind: Literal["http", "network", "validation", "unexpected"] = "unexpected",
) -> str:
    return json.dumps({"error": message, "kind": kind})
