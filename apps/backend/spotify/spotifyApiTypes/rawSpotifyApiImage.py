from pydantic import BaseModel


class RawSpotifyApiImage(BaseModel):
    url: str
    height: int | None
    width: int | None

    @classmethod
    def from_dict(cls, obj: object) -> "RawSpotifyApiImage":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)
