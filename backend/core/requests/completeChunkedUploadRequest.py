from pydantic import BaseModel


class CompleteChunkedUploadRequest(BaseModel):
    uploadId: str