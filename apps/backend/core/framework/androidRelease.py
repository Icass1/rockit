from datetime import UTC, datetime

from config import settings
from core.framework.admin.androidBuilds import AndroidBuilds
from core.framework.admin.androidBuildShare import create_share
from core.responses.androidBuildResponse import (
    LatestAndroidApkResponse,
    LatestAndroidReleaseResponse,
)
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class AndroidRelease:
    @staticmethod
    async def latest_async() -> Result[LatestAndroidReleaseResponse]:
        if not settings.ANDROID_BUILDS_GITHUB_TOKEN:
            logger.warning("Android releases require GitHub Actions read access")
            return Result(
                code=ResultCode.SERVICE_UNAVAILABLE, message="ADMIN_ANDROID_DOWNLOAD_CONFIG"
            )
        source = await AndroidBuilds.source_async(branch="main")
        if source.is_not_ok():
            return Result[LatestAndroidReleaseResponse].from_result(source)
        runs, artifacts = source.result()
        now = datetime.now(UTC).timestamp()
        for run in sorted(runs.workflow_runs, key=lambda entry: entry.run_number, reverse=True):
            if run.head_branch != "main" or run.conclusion != "success":
                continue
            candidates = [
                item for item in artifacts.artifacts if AndroidBuilds.is_apk(run=run, artifact=item)
            ]
            if not candidates and now - run.created_at.timestamp() < 90 * 24 * 60 * 60:
                run_artifacts = await AndroidBuilds.artifacts_for_run_async(run_id=run.id)
                if run_artifacts.is_not_ok():
                    return Result[LatestAndroidReleaseResponse].from_result(run_artifacts)
                candidates = [
                    item
                    for item in run_artifacts.result().artifacts
                    if AndroidBuilds.is_apk(run=run, artifact=item)
                ]
            artifact = next(
                (
                    item
                    for item in candidates
                    if not item.expired and item.expires_at.timestamp() > now
                ),
                None,
            )
            if artifact is None:
                continue
            share = create_share(run=run, artifact=artifact)
            if share.is_not_ok():
                return Result[LatestAndroidReleaseResponse].from_result(share)
            return Result[LatestAndroidReleaseResponse].ok(
                LatestAndroidReleaseResponse(
                    apk=LatestAndroidApkResponse(
                        buildNumber=run.run_number,
                        versionCode=AndroidBuilds.version_code(run=run, artifact=artifact),
                        apkUrl=share.result().url,
                    )
                )
            )
        return Result[LatestAndroidReleaseResponse].ok(LatestAndroidReleaseResponse(apk=None))
