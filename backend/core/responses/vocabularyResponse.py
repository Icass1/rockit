from typing import Dict

from pydantic import BaseModel


class VocabularyResponse(BaseModel):
    vocabulary: Dict[str, Dict[str, str]]
