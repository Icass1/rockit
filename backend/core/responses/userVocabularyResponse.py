from typing import Dict

from pydantic import BaseModel


class UserVocabularyResponse(BaseModel):
    vocabulary: Dict[str, str]
    currentLang: str
