from pydantic import BaseModel


class SessionResponse(BaseModel):
    username: str | None
    image: str | None
    admin: bool
