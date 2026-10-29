from dataclasses import dataclass, field


def _empty_nested_dict() -> dict[str, dict[str, str]]:
    return {}


@dataclass
class VocabularyItem:
    key: str
    value: str


@dataclass
class VocabularyImportData:
    vocabulary: dict[str, dict[str, str]] = field(default_factory=_empty_nested_dict)
