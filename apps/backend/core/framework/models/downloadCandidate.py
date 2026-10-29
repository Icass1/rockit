from dataclasses import dataclass


@dataclass(frozen=True)
class DownloadCandidate:
    """Candidate media; path is a legacy field name containing an S3 key."""

    id: int
    public_id: str
    provider_id: int
    path: str | None
    name: str = ""
    provider: str = ""
