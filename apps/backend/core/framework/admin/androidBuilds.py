import asyncio
import re

import httpx
from pydantic import ValidationError

from config import settings
from core.models.androidBuildHistory import GitHubArtifacts, GitHubRuns
from core.responses.androidBuildResponse import AndroidBuildHistoryResponse, AndroidBuildResponse
from logger import getLogger
from result import Result

logger = getLogger(__name__)


class AndroidBuilds:
    @staticmethod
    async def history_async() -> Result[AndroidBuildHistoryResponse]:
        """Read GitHub's build history server-side; never send credentials to clients."""
        repository = settings.ANDROID_BUILDS_REPOSITORY
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
            logger.warning("Invalid Android build repository configuration")
            repository = "Icass1/rockit"
        workflow = "build-android-preview.yml"
        url = f"https://github.com/{repository}/actions/workflows/{workflow}"
        fallback = AndroidBuildHistoryResponse(
            builds=[], workflowUrl=url, availability="unavailable"
        )
        headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
        if settings.ANDROID_BUILDS_GITHUB_TOKEN:
            headers["Authorization"] = (
                f"Bearer {settings.ANDROID_BUILDS_GITHUB_TOKEN.get_secret_value()}"
            )
        try:
            async with httpx.AsyncClient(timeout=12, headers=headers) as client:
                runs_response, artifacts_response = await asyncio.gather(
                    client.get(
                        f"https://api.github.com/repos/{repository}/actions/workflows/{workflow}/runs",
                        params={"per_page": 30},
                    ),
                    client.get(
                        f"https://api.github.com/repos/{repository}/actions/artifacts",
                        params={"per_page": 100},
                    ),
                )
            runs_response.raise_for_status()
            artifacts_response.raise_for_status()
            runs = GitHubRuns.model_validate(runs_response.json())
            artifacts = GitHubArtifacts.model_validate(artifacts_response.json())
        except (httpx.HTTPError, ValidationError, ValueError):
            # Error text can contain authenticated request data; log only the capability failure.
            logger.warning(
                "GitHub Android build history unavailable; check repository access or rate limit"
            )
            return Result[AndroidBuildHistoryResponse].ok(fallback)
        by_run = {
            a.workflow_run.id: a
            for a in artifacts.artifacts
            if a.workflow_run and a.name.startswith("RockIt-Android-preview-")
        }
        builds: list[AndroidBuildResponse] = []
        for run in runs.workflow_runs:
            artifact = by_run.get(run.id)
            run_url = f"https://github.com/{repository}/actions/runs/{run.id}"
            builds.append(
                AndroidBuildResponse(
                    runId=run.id,
                    number=run.run_number,
                    branch=run.head_branch or "",
                    commit=run.head_sha[:7],
                    status=run.status,
                    conclusion=run.conclusion,
                    createdAt=run.created_at,
                    url=run_url,
                    artifactUrl=f"{run_url}/artifacts/{artifact.id}"
                    if artifact and not artifact.expired
                    else None,
                    expiresAt=artifact.expires_at if artifact else None,
                    expired=artifact.expired if artifact else False,
                )
            )
        return Result[AndroidBuildHistoryResponse].ok(
            AndroidBuildHistoryResponse(builds=builds, workflowUrl=url, availability="available")
        )
