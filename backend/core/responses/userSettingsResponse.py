from pydantic import BaseModel


class UserSettingsResponse(BaseModel):
    username: str
    lang: str
    crossfade: int
    randomQueue: bool
    repeatMode: str
