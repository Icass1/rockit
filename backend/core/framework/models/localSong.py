from dataclasses import dataclass


@dataclass
class LocalSong:
    """Provider-neutral local metadata; file paths never leave the backend."""

    public_id: str
    name: str
    artists: list[str]
    file_path: str
