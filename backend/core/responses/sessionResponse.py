from pydantic import BaseModel


class SessionResponse(BaseModel):
    username: str
    image: str
    admin: bool
