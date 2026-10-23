from pydantic import BaseModel, Field


class ArtistMetadataIdentity(BaseModel):
    id: str
    name: str
    note: str


class ArtistMetadataItem(BaseModel):
    id: str
    title: str
    date: str = ""
    kind: str = ""
    secondaryTypes: list[str] = Field(default_factory=list)
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
