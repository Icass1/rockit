from pydantic import BaseModel


class RegisterResponse(BaseModel):
    userId: str
