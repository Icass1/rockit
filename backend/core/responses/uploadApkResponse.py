from pydantic import BaseModel


class UploadApkResponse(BaseModel):
    message: str
    id: int
    filename: str
