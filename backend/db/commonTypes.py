from dataclasses import dataclass


@dataclass
class ArtistDB:
    name: str
    id: str

@dataclass
class OldImageDB:
    url: str
    width: int
    height: int
