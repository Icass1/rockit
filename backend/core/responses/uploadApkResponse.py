from pydantic import BaseModel


class UploadApkResponse(BaseModel):
    message: str
    publicId: str
    filename: str
