from dataclasses import dataclass


@dataclass(frozen=True)
class DownloadCandidate:
    id: int
    public_id: str
    provider_id: int
    path: str | None
    name: str = ""
    provider: str = ""
