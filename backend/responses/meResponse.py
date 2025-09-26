from pydantic import BaseModel


class MeResponse(BaseModel):
    username: str | None
    image: str | None
    admin: bool
