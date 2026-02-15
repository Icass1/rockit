from pydantic import BaseModel


class OkResponse(BaseModel):
    status: str = "OK"
