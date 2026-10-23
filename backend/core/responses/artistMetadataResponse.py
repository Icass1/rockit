from pydantic import BaseModel


class ArtistMetadataIdentity(BaseModel):
    id: str
    name: str
    note: str


class ArtistMetadataItem(BaseModel):
    id: str
    title: str
    date: str = ""
    kind: str = ""
    imageUrl: str = ""


class ArtistMetadataCandidates(BaseModel):
    candidates: list[ArtistMetadataIdentity]


class ArtistMetadataProfile(BaseModel):
    name: str
    description: str
    genres: list[str]
    related: list[ArtistMetadataIdentity]
    events: list[ArtistMetadataItem]


class ArtistMetadataCatalog(BaseModel):
    items: list[ArtistMetadataItem]
    total: int
    offset: int
