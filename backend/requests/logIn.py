from pydantic import BaseModel


class LoginInRequest(BaseModel):
    username: str
    password: str
