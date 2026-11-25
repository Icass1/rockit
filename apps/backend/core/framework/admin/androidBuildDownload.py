import asyncio
import os
import shutil
import tempfile
import zipfile
from pathlib import Path

import httpx

from config import settings
from core.framework.admin.androidBuilds import AndroidBuilds
from core.models.androidBuildDownload import AndroidBuildDownload
from core.models.androidBuildHistory import GitHubArtifact, GitHubRun
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)
MAX_BUILD_BYTES = 512 * 1024 * 1024


def extract_apk(archive_path: str, output: str) -> None:
    """Copy exactly one APK to our own filename; never extract paths supplied by the archive."""
    with zipfile.ZipFile(archive_path) as archive:
        candidates = [
            item
            for item in archive.infolist()
            if not item.is_dir() and item.filename.lower().endswith(".apk")
        ]
        if len(candidates) != 1 or candidates[0].file_size > MAX_BUILD_BYTES:
            raise ValueError("Artifact must contain one bounded APK")
        size = 0
        with archive.open(candidates[0]) as source, open(output, "wb") as target:
            while chunk := source.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_BUILD_BYTES:
                    raise ValueError("APK is too large")
                target.write(chunk)
    with zipfile.ZipFile(output) as apk:
        if "AndroidManifest.xml" not in apk.namelist():
            raise ValueError("Invalid APK")


class AndroidBuildDownloads:
    @staticmethod
    async def resolve_async(
        run_id: int, artifact_id: int | None = None
    ) -> Result[tuple[GitHubRun, GitHubArtifact]]:
        if not settings.ANDROID_BUILDS_GITHUB_TOKEN:
            logger.warning("GitHub artifact download requires server credentials")
            return Result(code=ResultCode.BAD_REQUEST, message="ADMIN_ANDROID_DOWNLOAD_CONFIG")
        source = await AndroidBuilds.source_async()
        if source.is_not_ok():
            return Result[tuple[GitHubRun, GitHubArtifact]].from_result(source)
        runs, artifacts = source.result()
        run = next(
            (
                item
                for item in runs.workflow_runs
                if item.id == run_id and item.conclusion == "success"
            ),
            None,
        )
        artifact = next(
            (
                item
                for item in artifacts.artifacts
                if item.workflow_run
                and item.workflow_run.id == run_id
                and (artifact_id is None or item.id == artifact_id)
                and item.name.startswith("RockIt-Android-preview-")
                and not item.expired
            ),
            None,
        )
        if run is None or artifact is None:
            logger.warning("Requested Android build is unavailable or expired")
            return Result(code=ResultCode.NOT_FOUND, message="ADMIN_ANDROID_EXPIRED")
        return Result[tuple[GitHubRun, GitHubArtifact]].ok((run, artifact))

    @staticmethod
    async def create_async(
        run_id: int, artifact_id: int | None = None
    ) -> Result[AndroidBuildDownload]:
        resolved = await AndroidBuildDownloads.resolve_async(run_id=run_id, artifact_id=artifact_id)
        if resolved.is_not_ok():
            return Result[AndroidBuildDownload].from_result(resolved)
        run, artifact = resolved.result()
        os.makedirs(settings.TEMP_PATH, exist_ok=True)
        directory = tempfile.mkdtemp(prefix="rockit-android-", dir=settings.TEMP_PATH)
        archive_path = str(Path(directory) / "artifact.zip")
        filename = f"RockIt-Android-{run.run_number}.apk"
        output = str(Path(directory) / filename)
        keep = False
        worker: asyncio.Task[None] | None = None
        try:
            # HTTPX removes Authorization when following a redirect to the signed storage host.
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(120, connect=15),
                headers=AndroidBuilds.headers(),
                follow_redirects=True,
            ) as client:
                async with client.stream(
                    "GET",
                    f"https://api.github.com/repos/{AndroidBuilds.repository()}/actions/artifacts/{artifact.id}/zip",
                ) as response:
                    response.raise_for_status()
                    size = 0
                    with open(archive_path, "wb") as destination:
                        async for chunk in response.aiter_bytes(1024 * 1024):
                            size += len(chunk)
                            if size > MAX_BUILD_BYTES:
                                raise ValueError("Artifact is too large")
                            await asyncio.to_thread(destination.write, chunk)
            worker = asyncio.create_task(asyncio.to_thread(extract_apk, archive_path, output))
            await asyncio.shield(worker)
            os.unlink(archive_path)
            keep = True
            return Result[AndroidBuildDownload].ok(
                AndroidBuildDownload(directory=directory, path=output, filename=filename)
            )
        except asyncio.CancelledError:
            if worker is not None and not worker.done():
                worker.add_done_callback(
                    lambda task: (
                        task.exception() if not task.cancelled() else None,
                        shutil.rmtree(directory, ignore_errors=True),
                    )
                )
                keep = True
            raise
        except (httpx.HTTPError, ValueError, OSError, zipfile.BadZipFile):
            logger.warning("Unable to prepare Android APK download")
            return Result(code=ResultCode.GENERAL_ERROR, message="ADMIN_ANDROID_DOWNLOAD_FAILED")
        finally:
            if not keep:
                shutil.rmtree(directory, ignore_errors=True)
