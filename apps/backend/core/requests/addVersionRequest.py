from typing import Optional

from pydantic import BaseModel


class AddVersionRequest(BaseModel):
    version: str
    apkFilename: str
    description: Optional[str] = None
