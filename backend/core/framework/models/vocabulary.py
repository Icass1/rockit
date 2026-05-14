from dataclasses import dataclass, field
from typing import Dict


def _empty_nested_dict() -> Dict[str, Dict[str, str]]:
    return {}


@dataclass
class VocabularyItem:
    key: str
    value: str


@dataclass
class VocabularyImportData:
    vocabulary: Dict[str, Dict[str, str]] = field(default_factory=_empty_nested_dict)
