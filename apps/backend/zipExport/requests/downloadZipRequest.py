from pydantic import BaseModel


class DownloadZipRequest(BaseModel):
    ids: list[str]
    title: str
