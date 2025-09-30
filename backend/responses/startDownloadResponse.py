from pydantic import BaseModel


class StartDownloadResponse(BaseModel):
    downloadId: str
