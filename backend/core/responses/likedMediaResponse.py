from typing import List
from pydantic import BaseModel


class LikedMediaResponse(BaseModel):
    media: List[str]
