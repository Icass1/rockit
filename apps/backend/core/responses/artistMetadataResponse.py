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


class ArtistImageSource(BaseModel):
    provider: str
    externalId: str


class ArtistImageMetadata(BaseModel):
    imageUrl: str = ""
    sourceUrl: str = ""
    width: int = 0
    height: int = 0


class ArtistMetadataProfile(BaseModel):
    name: str
    description: str
    genres: list[str]
    related: list[ArtistMetadataIdentity]
    events: list[ArtistMetadataItem]
    imageSources: list[ArtistImageSource] = Field(default_factory=list[ArtistImageSource])


class ArtistMetadataCatalog(BaseModel):
    items: list[ArtistMetadataItem]
    total: int
    offset: int
