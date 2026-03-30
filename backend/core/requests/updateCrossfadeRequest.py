from pydantic import BaseModel


class UpdateCrossfadeRequest(BaseModel):
    crossfade: int
