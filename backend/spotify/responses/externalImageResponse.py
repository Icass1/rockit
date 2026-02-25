from typing import Optional
from pydantic import BaseModel


class ExternalImageResponse(BaseModel):
    url: str
    width: Optional[int] = None
    height: Optional[int] = None
