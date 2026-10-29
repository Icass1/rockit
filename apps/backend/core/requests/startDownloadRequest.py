from pydantic import BaseModel


class StartDownloadRequest(BaseModel):
    ids: list[str]
    title: str
