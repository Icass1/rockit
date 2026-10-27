from pydantic import BaseModel


class StartUploadResponse(BaseModel):
    uploadId: str
