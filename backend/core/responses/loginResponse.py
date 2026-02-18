from pydantic import BaseModel


class LoginResponse(BaseModel):
    user_id: str
