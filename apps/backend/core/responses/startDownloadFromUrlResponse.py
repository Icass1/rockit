from backend.core.responses.addFromUrlResponse import AddFromUrlResponse


class StartDownloadFromUrlResponse(AddFromUrlResponse):
    downloadGroupId: str
