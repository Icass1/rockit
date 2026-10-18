from pydantic import BaseModel


class ProfileImageResponse(BaseModel):
    publicId: str
    url: str
