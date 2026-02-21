from typing import List
from pydantic import BaseModel


class StartDownloadRequest(BaseModel):
    ids: List[str]
    title: str
