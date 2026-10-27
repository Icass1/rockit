from pydantic import BaseModel


class DownloadSettingsResponse(BaseModel):
    autoAddToLibrary: bool
