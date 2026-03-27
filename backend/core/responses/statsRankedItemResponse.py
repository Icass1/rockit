from pydantic import BaseModel


class StatsRankedItemResponse(BaseModel):
    publicId: str
    name: str
    href: str
    value: int
    imageUrl: str | None = None
    subtitle: str | None = None
