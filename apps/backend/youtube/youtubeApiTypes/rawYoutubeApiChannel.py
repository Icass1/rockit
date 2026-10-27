from typing import Any

from pydantic import BaseModel


class RawYoutubeChannel(BaseModel):
    kind: str | None = None
    etag: str | None = None
    id: str | None = None
    snippet: dict[str, Any] | None = None
    statistics: dict[str, Any] | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "RawYoutubeChannel":
        return cls.model_validate(obj)
