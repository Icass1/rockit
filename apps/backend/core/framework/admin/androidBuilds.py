import asyncio
import re

import httpx
from pydantic import ValidationError

from config import settings
from core.models.androidBuildHistory import GitHubArtifacts, GitHubRuns
from core.responses.androidBuildResponse import AndroidBuildHistoryResponse, AndroidBuildResponse
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class AndroidBuilds:
    @staticmethod
    def repository() -> str:
        repository = settings.ANDROID_BUILDS_REPOSITORY
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
            logger.warning("Invalid Android build repository configuration")
            return "Icass1/rockit"
        return repository

    @staticmethod
    def headers() -> dict[str, str]:
        headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
        if settings.ANDROID_BUILDS_GITHUB_TOKEN:
            headers["Authorization"] = (
                f"Bearer {settings.ANDROID_BUILDS_GITHUB_TOKEN.get_secret_value()}"
            )
        return headers

    @staticmethod
    async def source_async() -> Result[tuple[GitHubRuns, GitHubArtifacts]]:
        repository = AndroidBuilds.repository()
        try:
            async with httpx.AsyncClient(timeout=12, headers=AndroidBuilds.headers()) as client:
                runs_response, artifacts_response = await asyncio.gather(
                    client.get(
                        f"https://api.github.com/repos/{repository}/actions/workflows/build-android-preview.yml/runs",
                        params={"per_page": 30},
                    ),
                    client.get(
                        f"https://api.github.com/repos/{repository}/actions/artifacts",
                        params={"per_page": 100},
                    ),
                )
            runs_response.raise_for_status()
            artifacts_response.raise_for_status()
            return Result[tuple[GitHubRuns, GitHubArtifacts]].ok(
                (
                    GitHubRuns.model_validate(runs_response.json()),
                    GitHubArtifacts.model_validate(artifacts_response.json()),
                )
            )
        except (httpx.HTTPError, ValidationError, ValueError):
            logger.warning(
                "GitHub Android build history unavailable; check repository access or rate limit"
            )
            return Result(
                code=ResultCode.GENERAL_ERROR, message="ADMIN_ANDROID_HISTORY_UNAVAILABLE"
            )

    @staticmethod
    async def history_async() -> Result[AndroidBuildHistoryResponse]:
        """Read GitHub history server-side and expose Rockit download URLs, never credentials."""
        url = f"https://github.com/{AndroidBuilds.repository()}/actions/workflows/build-android-preview.yml"
        enabled = bool(settings.ANDROID_BUILDS_GITHUB_TOKEN)
        source = await AndroidBuilds.source_async()
        if source.is_not_ok():
            return Result[AndroidBuildHistoryResponse].ok(
                AndroidBuildHistoryResponse(
                    builds=[], workflowUrl=url, availability="unavailable", downloadsEnabled=enabled
                )
            )
        runs, artifacts = source.result()
        by_run = {
            artifact.workflow_run.id: artifact
            for artifact in reversed(artifacts.artifacts)
            if artifact.workflow_run and artifact.name.startswith("RockIt-Android-preview-")
        }
        builds: list[AndroidBuildResponse] = []
        for run in runs.workflow_runs:
            artifact = by_run.get(run.id)
            builds.append(
                AndroidBuildResponse(
                    runId=run.id,
                    number=run.run_number,
                    branch=run.head_branch or "",
                    commit=run.head_sha[:7],
                    status=run.status,
                    conclusion=run.conclusion,
                    createdAt=run.created_at,
                    url=f"https://github.com/{AndroidBuilds.repository()}/actions/runs/{run.id}",
                    artifactUrl=f"/admin/builds/android/{run.id}/download"
                    if artifact and not artifact.expired and run.conclusion == "success"
                    else None,
                    expiresAt=artifact.expires_at if artifact else None,
                    expired=artifact.expired if artifact else False,
                )
            )
        return Result[AndroidBuildHistoryResponse].ok(
            AndroidBuildHistoryResponse(
                builds=builds, workflowUrl=url, availability="available", downloadsEnabled=enabled
            )
        )
