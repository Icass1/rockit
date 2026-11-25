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
    downloadsEnabled: bool = True
    availability: Literal["available", "unavailable"]


class AndroidBuildShareResponse(BaseModel):
    url: str


class LatestAndroidApkResponse(BaseModel):
    buildNumber: int
    versionCode: int | None
    apkUrl: str


class LatestAndroidReleaseResponse(BaseModel):
    apk: LatestAndroidApkResponse | None
