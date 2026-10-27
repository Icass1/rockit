from pydantic import BaseModel


class UrlMatchResponse(BaseModel):
    path: str | None = None
