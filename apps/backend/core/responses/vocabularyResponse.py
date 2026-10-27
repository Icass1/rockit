from pydantic import BaseModel


class VocabularyResponse(BaseModel):
    vocabulary: dict[str, str]
    currentLang: str
