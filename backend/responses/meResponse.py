from pydantic import BaseModel


class MeReponse(BaseModel):
    username: str | None
    image: str | None
    admin: bool
