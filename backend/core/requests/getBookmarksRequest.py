from pydantic import BaseModel


class GetBookmarksRequest(BaseModel):
    mediaPublicId: str | None = None
