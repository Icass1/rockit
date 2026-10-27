from pydantic import BaseModel, Field

from core.responses.artistMetadataResponse import ArtistImageMetadata

__generate_frontend__ = False


class ImageValue(BaseModel):
    value: str = ""


class ImageSnak(BaseModel):
    datavalue: ImageValue | None = None


class ImageClaim(BaseModel):
    rank: str = "normal"
    mainsnak: ImageSnak


class ImageClaims(BaseModel):
    P18: list[ImageClaim] = Field(default_factory=list[ImageClaim])


class ImageEntity(BaseModel):
    claims: ImageClaims = Field(default_factory=ImageClaims)


class ApiError(BaseModel):
    code: str = "unknown"
    info: str = ""


class EntityResponse(BaseModel):
    entities: dict[str, ImageEntity] = Field(default_factory=dict[str, ImageEntity])
    error: ApiError | None = None


class ImageInfo(BaseModel):
    url: str = ""
    thumburl: str = ""
    descriptionurl: str = ""
    width: int = 0
    height: int = 0


class ImagePage(BaseModel):
    imageinfo: list[ImageInfo] = Field(default_factory=list[ImageInfo])


class ImageQuery(BaseModel):
    pages: list[ImagePage] = Field(default_factory=list[ImagePage])


class CommonsResponse(BaseModel):
    query: ImageQuery = Field(default_factory=ImageQuery)
    error: ApiError | None = None


class ArtistImage(ArtistImageMetadata):
    """Cached image projection shared with generic metadata consumers."""

    lookupVersion: int = 2
