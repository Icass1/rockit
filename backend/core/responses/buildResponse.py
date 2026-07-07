from datetime import datetime
from typing import List, Optional

from backend.core.baseModel import BaseModel


class BuildResponse(BaseModel):
    publicId: str
    version: str
    apkFilename: str
    description: Optional[str]
    downloads: int
    dateAdded: datetime


class AllBuildsResponse(BaseModel):
    builds: List[BuildResponse]
