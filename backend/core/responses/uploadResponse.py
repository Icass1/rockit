from pydantic import BaseModel


class UploadResponse(BaseModel):
    publicId: str
    message: str
    filename: str | None = None
