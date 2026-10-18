from pydantic import BaseModel


class UpdatePasswordRequest(BaseModel):
    password: str
