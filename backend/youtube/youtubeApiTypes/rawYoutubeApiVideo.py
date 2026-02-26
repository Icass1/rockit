from typing import Any, Optional
from pydantic import BaseModel


class RawYoutubeVideo(BaseModel):
    kind: Optional[str] = None
    etag: Optional[str] = None
    id: Optional[str] = None
    snippet: Optional[dict[str, Any]] = None
    contentDetails: Optional[dict[str, Any]] = None
    statistics: Optional[dict[str, Any]] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "RawYoutubeVideo":
        return cls.model_validate(obj)
