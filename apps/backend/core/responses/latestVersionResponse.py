from pydantic import BaseModel


class LatestVersionResponse(BaseModel):
    version: str
    apkUrl: str
