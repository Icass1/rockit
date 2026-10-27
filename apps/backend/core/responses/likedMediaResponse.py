from pydantic import BaseModel


class LikedMediaResponse(BaseModel):
    media: list[str]
