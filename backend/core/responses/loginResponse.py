from pydantic import BaseModel


class LoginResponse(BaseModel):
    userId: str
