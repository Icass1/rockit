from pydantic import BaseModel


class StartChunkedUploadRequest(BaseModel):
    fileName: str
    totalSize: int
    version: str
    description: str | None = None