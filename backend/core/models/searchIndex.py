from dataclasses import dataclass


@dataclass
class SearchIndexEntry:
    internal_id: int
    public_id: str | None
    name: str
    media_type_key: int
    provider_name: str
    image_url: str | None
    score: float
