from pydantic import BaseModel


class LanguageItem(BaseModel):
    langCode: str
    language: str


class LanguagesResponse(BaseModel):
    languages: list[LanguageItem]
