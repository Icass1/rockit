from pydantic import BaseModel


class RegisterRequest(BaseModel):
    username: str
    password: str
    repeatPassword: str
