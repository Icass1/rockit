from pydantic import BaseModel


class StartDownloadResponse(BaseModel):
    downloadGroupId: str
