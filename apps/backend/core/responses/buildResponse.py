from datetime import datetime

from core.baseModel import BaseModel


class BuildResponse(BaseModel):
    publicId: str
    version: str
    apkFilename: str
    description: str | None
    downloads: int
    dateAdded: datetime


class AllBuildsResponse(BaseModel):
    builds: list[BuildResponse]
