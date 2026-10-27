from pydantic import BaseModel


class AddVersionRequest(BaseModel):
    version: str
    apkFilename: str
    description: str | None = None
