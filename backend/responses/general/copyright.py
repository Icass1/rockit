from pydantic import BaseModel


class RockItCopyrightResponse(BaseModel):
    text: str
    type: str