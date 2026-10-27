from typing import Literal

from pydantic import BaseModel


class AudioBoundsResponse(BaseModel):
    """Optional original-clock boundaries; unavailable analysis never blocks audio."""

    status: Literal["pending", "ready", "unavailable"] = "unavailable"
    start: float = 0.0
    end: float | None = None
    duration: float | None = None
    fingerprint: str | None = None
