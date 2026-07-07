from typing import Literal

from pydantic import BaseModel


class UploadApkResponse(BaseModel):
    message: Literal["BUILD_UPLOAD_SUCCESS"]
    publicId: str
    filename: str
