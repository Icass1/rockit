from pydantic import BaseModel


class UploadSongRequest(BaseModel):
    title: str
    artistNames: list[str]
    fileSize: int
    discNumber: int
    trackNumber: int
