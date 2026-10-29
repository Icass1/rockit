from pydantic import BaseModel


class LikeMediaRequest(BaseModel):
    publicIds: list[str]
