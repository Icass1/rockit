from pydantic import BaseModel


class AddMediaToPlaylistRequest(BaseModel):
    mediaPublicId: str
