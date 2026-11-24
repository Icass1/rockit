from datetime import datetime
from typing import Literal

from core.baseModel import BaseModel


class AndroidBuildResponse(BaseModel):
    runId: int
    number: int
    branch: str
    commit: str
    status: str
    conclusion: str | None
    createdAt: datetime
    url: str
    artifactUrl: str | None
    expiresAt: datetime | None
    expired: bool


class AndroidBuildHistoryResponse(BaseModel):
    builds: list[AndroidBuildResponse]
    workflowUrl: str
    availability: Literal["available", "unavailable"]
