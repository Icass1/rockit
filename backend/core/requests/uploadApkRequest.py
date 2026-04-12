from pydantic import BaseModel


class UploadApkRequest(BaseModel):
    version: str
    description: str | None = None
    fileContent: str  # base64 encoded APK content
    fileName: str  # original filename for extension