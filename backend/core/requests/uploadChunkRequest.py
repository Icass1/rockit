from pydantic import BaseModel


class UploadChunkRequest(BaseModel):
    uploadId: str
    chunkIndex: int
    chunkData: str  # base64 encoded chunk
    chunkSize: int
    totalChunks: int