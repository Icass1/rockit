from typing import List

from pydantic import BaseModel


class DownloadZipRequest(BaseModel):
    ids: List[str]
    title: str
