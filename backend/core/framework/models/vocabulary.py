from dataclasses import dataclass, field
from typing import Dict, List


def _empty_dict() -> Dict[str, str]:
    return {}


def _empty_list() -> List["LanguageVocabulary"]:
    return []


def _empty_nested_dict() -> Dict[str, Dict[str, str]]:
    return {}


@dataclass
class VocabularyItem:
    key: str
    value: str


@dataclass
class LanguageVocabulary:
    lang_code: str
    translations: Dict[str, str] = field(default_factory=_empty_dict)


@dataclass
class AllVocabulary:
    languages: List["LanguageVocabulary"] = field(default_factory=_empty_list)


@dataclass
class VocabularyImportData:
    vocabulary: Dict[str, Dict[str, str]] = field(default_factory=_empty_nested_dict)
