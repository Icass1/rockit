from pydantic import BaseModel


class UploadVideoRequest(BaseModel):
    title: str
    fileSize: int
