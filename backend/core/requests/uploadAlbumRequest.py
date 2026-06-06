from pydantic import BaseModel

from backend.core.requests.uploadSongRequest import UploadSongRequest


class UploadAlbumRequest(BaseModel):
    title: str
    artistName: list[str]
    songs: list[UploadSongRequest]
