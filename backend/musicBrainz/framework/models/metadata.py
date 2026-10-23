"""Typed MusicBrainz projections; raw source JSON stays in the provider cache."""

from pydantic import BaseModel, Field

__generate_frontend__ = False


class SourceIdentity(BaseModel):
    id: str = ""
    name: str = ""


class SourceLifespan(BaseModel):
    begin: str | None = None


class SourceArea(BaseModel):
    name: str = ""


class SourceGenre(BaseModel):
    name: str


class SourceEvent(SourceIdentity):
    lifespan: SourceLifespan | None = Field(default=None, alias="life-span")


class SourceUrl(BaseModel):
    resource: str = ""


class SourceRelation(BaseModel):
    type: str = ""
    begin: str | None = None
    artist: SourceIdentity | None = None
    event: SourceEvent | None = None
    url: SourceUrl | None = None


class SourceArtist(SourceIdentity):
    disambiguation: str | None = None
    country: str | None = None
    type: str | None = None
    score: float = 0
    area: SourceArea | None = None
    lifespan: SourceLifespan | None = Field(default=None, alias="life-span")
    genres: list[SourceGenre] = Field(default_factory=list[SourceGenre])
    relations: list[SourceRelation] = Field(default_factory=list[SourceRelation])


class SourceArtistSearch(BaseModel):
    artists: list[SourceArtist] = Field(default_factory=list[SourceArtist])


class SourceCatalogItem(BaseModel):
    id: str
    title: str
    date: str | None = Field(default=None, alias="first-release-date")
    primary_type: str | None = Field(default=None, alias="primary-type")
    secondary_types: list[str] | None = Field(default=None, alias="secondary-types")


class SourceCatalog(BaseModel):
    release_groups: list[SourceCatalogItem] = Field(
        default_factory=list[SourceCatalogItem], alias="release-groups"
    )
    recordings: list[SourceCatalogItem] = Field(default_factory=list[SourceCatalogItem])
    release_group_count: int | None = Field(default=None, alias="release-group-count")
    recording_count: int | None = Field(default=None, alias="recording-count")
    release_group_offset: int | None = Field(default=None, alias="release-group-offset")
    recording_offset: int | None = Field(default=None, alias="recording-offset")
