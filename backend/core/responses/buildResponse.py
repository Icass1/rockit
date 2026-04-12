from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class BuildResponse(BaseModel):
    id: int
    version: str
    apkFilename: str
    description: Optional[str]
    downloads: int
    dateAdded: datetime


class AllBuildsResponse(BaseModel):
    builds: List[BuildResponse]
