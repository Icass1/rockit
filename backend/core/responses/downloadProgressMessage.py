from pydantic import BaseModel


class DownloadProgressMessage(BaseModel):
    type: str = "download_progress"
    download_id: int
    status: str
    progress: float
    message: str
