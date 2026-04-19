from pydantic import BaseModel


class StartChunkedUploadResponse(BaseModel):
    uploadId: str
    chunkSize: int
    totalChunks: int