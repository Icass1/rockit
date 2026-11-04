from pydantic import BaseModel, StrictBool


class UpdateDownloadSettingsRequest(BaseModel):
    autoAddToLibrary: StrictBool
