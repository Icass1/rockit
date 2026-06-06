from pydantic import BaseModel


class UploadSongRequest(BaseModel):
    title: str
    artistName: list[str]
    fileSize: int
