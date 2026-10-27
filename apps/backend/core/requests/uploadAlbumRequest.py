from pydantic import BaseModel

from core.requests.uploadSongRequest import UploadSongRequest


class UploadAlbumRequest(BaseModel):
    title: str
    artistNames: list[str]
    songs: list[UploadSongRequest]
    releaseDate: str
