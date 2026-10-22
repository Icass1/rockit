from typing import Literal

from pydantic import BaseModel, StrictInt


class SessionTokenClaims(BaseModel):
    """Signed session metadata; timestamps are UTC Unix seconds."""

    iat: StrictInt
    exp: StrictInt
    sub: str
    jti: str
    platform: Literal["WEB", "MOBILE"]
    ip: str | None
