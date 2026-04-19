from pydantic import BaseModel


class UploadChunkResponse(BaseModel):
    uploadId: str
    chunkIndex: int
    chunksReceived: int
    totalChunks: int