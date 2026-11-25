from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock
from urllib.parse import parse_qs, urlsplit

import pytest
from pydantic import SecretStr

from config import settings
from core.framework.admin.androidBuilds import AndroidBuilds
from core.framework.androidRelease import AndroidRelease
from core.models.androidBuildHistory import (
    ArtifactRun,
    GitHubArtifact,
    GitHubArtifacts,
    GitHubRun,
    GitHubRuns,
)
from result import Result


@pytest.mark.asyncio
async def test_latest_android_release_filters_branch_status_and_artifact_kind(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    now = datetime.now(UTC)
    monkeypatch.setattr(settings, "ANDROID_BUILDS_GITHUB_TOKEN", SecretStr("fixture-token"))

    def run(number: int, branch: str = "main", conclusion: str = "success") -> GitHubRun:
        return GitHubRun(
            id=number,
            run_number=number,
            head_branch=branch,
            head_sha="fixture",
            status="completed",
            conclusion=conclusion,
            created_at=now,
            html_url="",
        )

    def artifact(number: int, name: str, *, expired: bool = False) -> GitHubArtifact:
        return GitHubArtifact(
            id=number * 10,
            name=f"RockIt-Android-preview-{name}",
            expired=expired,
            expires_at=now + timedelta(days=1),
            workflow_run=ArtifactRun(id=number),
        )

    source = AsyncMock(
        return_value=Result[tuple[GitHubRuns, GitHubArtifacts]].ok(
            (
                GitHubRuns(
                    workflow_runs=[
                        run(40),
                        run(44, "develop"),
                        run(42),
                        run(43, conclusion="failure"),
                        run(41),
                    ]
                ),
                GitHubArtifacts(
                    artifacts=[
                        artifact(44, "44-code-45"),
                        artifact(43, "43-code-44"),
                        artifact(42, "42-code-43", expired=True),
                        artifact(41, "build-logs-41"),
                        artifact(40, "40-code-41"),
                    ]
                ),
            )
        )
    )
    monkeypatch.setattr(AndroidBuilds, "source_async", source)
    monkeypatch.setattr(
        AndroidBuilds,
        "artifacts_for_run_async",
        AsyncMock(return_value=Result[GitHubArtifacts].ok(GitHubArtifacts(artifacts=[]))),
    )
    result = await AndroidRelease.latest_async()
    source.assert_awaited_once_with(branch="main")
    assert result.is_ok(), result.info()
    apk = result.result().apk
    assert apk is not None
    assert apk.buildNumber == 40
    assert apk.versionCode == 41
    link = urlsplit(apk.apkUrl)
    assert link.path == "/version/android/40/apk"
    assert parse_qs(link.query)["artifact"] == ["400"]
