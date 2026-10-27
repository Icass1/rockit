from dataclasses import dataclass


@dataclass
class LocalSong:
    """Provider-neutral local metadata; storage keys never leave the backend."""

    public_id: str
    name: str
    artists: list[str]
    storage_key: str
