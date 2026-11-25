import hmac
from datetime import UTC, datetime
from urllib.parse import urlencode

from config import settings
from core.framework.admin.androidBuildDownload import AndroidBuildDownloads
from core.framework.admin.androidBuilds import AndroidBuilds
from core.models.androidBuildHistory import GitHubArtifact, GitHubRun
from core.responses.androidBuildResponse import AndroidBuildShareResponse
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)
SHARE_DURATION_SECONDS = 24 * 60 * 60


def signature(run_id: int, artifact_id: int, expires: int) -> str:
    """Bind the download to one artifact and keep it separate from session credentials."""
    payload = f"android-apk-share:v1:{AndroidBuilds.repository()}:{run_id}:{artifact_id}:{expires}"
    return hmac.digest(settings.SESSION_TOKEN_SECRET.encode(), payload.encode(), "sha256").hex()


def valid_share(run_id: int, artifact_id: int, expires: int, token: str) -> bool:
    if expires <= int(datetime.now(UTC).timestamp()):
        return False
    return hmac.compare_digest(signature(run_id, artifact_id, expires), token)


async def create_share_async(run_id: int) -> Result[AndroidBuildShareResponse]:
    resolved = await AndroidBuildDownloads.resolve_async(run_id=run_id)
    if resolved.is_not_ok():
        return Result[AndroidBuildShareResponse].from_result(resolved)
    run, artifact = resolved.result()
    return create_share(run=run, artifact=artifact)


def create_share(run: GitHubRun, artifact: GitHubArtifact) -> Result[AndroidBuildShareResponse]:
    run_id = run.id
    now = int(datetime.now(UTC).timestamp())
    expires = min(int(artifact.expires_at.timestamp()), now + SHARE_DURATION_SECONDS)
    if expires <= now:
        logger.info("Cannot share expired Android build %s", run_id)
        return Result(code=ResultCode.NOT_FOUND, message="ADMIN_ANDROID_EXPIRED")
    query = urlencode(
        {
            "artifact": artifact.id,
            "expires": expires,
            "token": signature(run_id, artifact.id, expires),
        }
    )
    return Result[AndroidBuildShareResponse].ok(
        AndroidBuildShareResponse(
            url=f"{settings.BACKEND_URL.rstrip('/')}/version/android/{run_id}/apk?{query}",
        )
    )
