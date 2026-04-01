from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class Endpoint(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    token: str
    label: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    url: str | None = None


class CapturedRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    endpointId: str
    method: str
    path: str
    query: dict[str, str] = Field(default_factory=dict)
    headers: dict[str, str] = Field(default_factory=dict)
    body: str | None = None
    bodyType: str | None = None
    status: int | None = None
    latencyMs: int | None = None
    receivedAt: str


class RequestListMeta(BaseModel):
    model_config = ConfigDict(extra="allow")

    total: int
    limit: int
    nextCursor: str | None
    hasMore: bool


class RequestListResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    data: list[CapturedRequest]
    meta: RequestListMeta


class ReplayResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    targetUrl: str
    responseStatus: int | None = None
    latencyMs: int | None = None
    createdAt: str


class Flow(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    endpointId: str | None = None
    name: str
    isEnabled: bool = True
    config: dict[str, object] = Field(default_factory=dict)
    createdAt: str | None = None
    updatedAt: str | None = None
