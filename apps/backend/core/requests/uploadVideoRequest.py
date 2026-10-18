from pydantic import BaseModel


class UploadVideoRequest(BaseModel):
    title: str
    artistNames: list[str]
    fileSize: int
