from pydantic import BaseModel


class RegisterResponse(BaseModel):
    user_id: str
