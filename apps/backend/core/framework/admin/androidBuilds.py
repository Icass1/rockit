import asyncio
import re

import httpx
from pydantic import ValidationError

from config import settings
from core.models.androidBuildHistory import (
    ArtifactRun,
    GitHubArtifact,
    GitHubArtifacts,
    GitHubRun,
    GitHubRuns,
)
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
    def version_code(run: GitHubRun, artifact: GitHubArtifact) -> int | None:
        code = run.run_number + 1
        if artifact.name == f"RockIt-Android-preview-{run.run_number}-code-{code}":
            return code
        return None

    @staticmethod
    def is_apk(run: GitHubRun, artifact: GitHubArtifact) -> bool:
        return (
            artifact.workflow_run is not None
            and artifact.workflow_run.id == run.id
            and (
                artifact.name == f"RockIt-Android-preview-{run.run_number}"
                or AndroidBuilds.version_code(run=run, artifact=artifact) is not None
            )
        )

    @staticmethod
    async def source_async(branch: str | None = None) -> Result[tuple[GitHubRuns, GitHubArtifacts]]:
        repository = AndroidBuilds.repository()
        params: dict[str, str | int] = {"per_page": 30}
        if branch is not None:
            params.update(branch=branch, status="success")
        try:
            async with httpx.AsyncClient(timeout=12, headers=AndroidBuilds.headers()) as client:
                runs_response, artifacts_response = await asyncio.gather(
                    client.get(
                        f"https://api.github.com/repos/{repository}/actions/workflows/build-android-preview.yml/runs",
                        params=params,
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
    async def artifacts_for_run_async(run_id: int) -> Result[GitHubArtifacts]:
        repository = AndroidBuilds.repository()
        try:
            async with httpx.AsyncClient(timeout=12, headers=AndroidBuilds.headers()) as client:
                response = await client.get(
                    f"https://api.github.com/repos/{repository}/actions/runs/{run_id}/artifacts",
                    params={"per_page": 100},
                )
            response.raise_for_status()
            artifacts = GitHubArtifacts.model_validate(response.json())
            for artifact in artifacts.artifacts:
                if artifact.workflow_run is None:
                    artifact.workflow_run = ArtifactRun(id=run_id)
            return Result[GitHubArtifacts].ok(artifacts)
        except (httpx.HTTPError, ValidationError, ValueError):
            logger.warning("GitHub artifacts unavailable for Android run %s", run_id)
            return Result(
                code=ResultCode.SERVICE_UNAVAILABLE, message="ADMIN_ANDROID_HISTORY_UNAVAILABLE"
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
        builds: list[AndroidBuildResponse] = []
        for run in runs.workflow_runs:
            artifact = next(
                (
                    item
                    for item in artifacts.artifacts
                    if AndroidBuilds.is_apk(run=run, artifact=item)
                ),
                None,
            )
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
