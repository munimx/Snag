from __future__ import annotations

import os

DEFAULT_SERVER_URL = "https://snag-server.fly.dev"


def get_server_url() -> str:
    return os.getenv("SNAG_SERVER_URL", DEFAULT_SERVER_URL)


def get_auth_token() -> str | None:
    token = os.getenv("SNAG_AUTH_TOKEN")
    return token if token else None
