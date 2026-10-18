from typing import List
from pydantic import BaseModel


class LikeMediaRequest(BaseModel):
    publicIds: List[str]
