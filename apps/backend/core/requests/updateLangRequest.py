from pydantic import BaseModel


class UpdateLangRequest(BaseModel):
    lang: str
