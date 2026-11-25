import io
import shutil
import zipfile
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from fastapi import FastAPI
from pydantic import SecretStr

from config import settings
from core.controllers.versionController import router as version_router
from core.framework.admin.androidBuildDownload import AndroidBuildDownloads, extract_apk
from core.framework.admin.androidBuilds import AndroidBuilds
from core.framework.admin.androidBuildShare import create_share_async, signature
from core.models.androidBuildHistory import GitHubArtifacts, GitHubRuns
from result import Result


def artifact_bytes(names: list[str] | None = None) -> bytes:
    apk = io.BytesIO()
    with zipfile.ZipFile(apk, "w") as archive:
        archive.writestr("AndroidManifest.xml", "synthetic test manifest")
    artifact = io.BytesIO()
    with zipfile.ZipFile(artifact, "w") as archive:
        for name in names or ["nested/build.apk"]:
            archive.writestr(name, apk.getvalue())
    return artifact.getvalue()


def test_extraction_uses_our_filename_and_requires_one_apk(tmp_path: Path) -> None:
    source = tmp_path / "source.zip"
    source.write_bytes(artifact_bytes(["../../outside.apk"]))
    target = tmp_path / "download.apk"
    extract_apk(str(source), str(target))
    assert target.exists()
    assert not (tmp_path.parent / "outside.apk").exists()
    with zipfile.ZipFile(target) as archive:
        assert "AndroidManifest.xml" in archive.namelist()
    source.write_bytes(artifact_bytes(["one.apk", "two.apk"]))
    with pytest.raises(ValueError):
        extract_apk(str(source), str(target))


async def test_download_uses_matching_run_and_returns_apk_not_github_zip(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(settings, "ANDROID_BUILDS_GITHUB_TOKEN", SecretStr("fixture-token"))
    monkeypatch.setattr(settings, "TEMP_PATH", str(tmp_path))
    runs = GitHubRuns.model_validate(
        {
            "workflow_runs": [
                {
                    "id": 4,
                    "run_number": 25,
                    "head_branch": "develop",
                    "head_sha": "abcdef123456",
                    "status": "completed",
                    "conclusion": "success",
                    "created_at": "2026-11-24T00:00:00Z",
                    "html_url": "https://github.com/Icass1/rockit/actions/runs/4",
                }
            ]
        }
    )
    artifacts = GitHubArtifacts.model_validate(
        {
            "artifacts": [
                {
                    "id": 22,
                    "name": "RockIt-Android-preview-25",
                    "expired": False,
                    "expires_at": datetime.now(UTC) + timedelta(days=2),
                    "workflow_run": {"id": 4},
                }
            ]
        }
    )
    monkeypatch.setattr(
        AndroidBuilds,
        "source_async",
        AsyncMock(return_value=Result[tuple[GitHubRuns, GitHubArtifacts]].ok((runs, artifacts))),
    )
    original_client = httpx.AsyncClient
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, content=artifact_bytes())

    def client(
        *, timeout: httpx.Timeout, headers: dict[str, str], follow_redirects: bool
    ) -> httpx.AsyncClient:
        return original_client(
            transport=httpx.MockTransport(handler),
            timeout=timeout,
            headers=headers,
            follow_redirects=follow_redirects,
        )

    monkeypatch.setattr(httpx, "AsyncClient", client)
    result = await AndroidBuildDownloads.create_async(4)
    assert result.is_ok(), result.info()
    output = result.result()
    assert output.filename == "RockIt-Android-25.apk"
    assert requests[0].url.path.endswith("/artifacts/22/zip")
    with zipfile.ZipFile(output.path) as apk:
        assert apk.namelist() == ["AndroidManifest.xml"]
    assert not (Path(output.directory) / "artifact.zip").exists()
    shutil.rmtree(output.directory)
    missing = await AndroidBuildDownloads.create_async(999)
    assert missing.is_not_ok()
    assert list(tmp_path.iterdir()) == []

    share = await create_share_async(run_id=4)
    assert share.is_ok(), share.info()
    link = urlsplit(share.result().url)
    params = {key: values[0] for key, values in parse_qs(link.query).items()}
    expires = int(params["expires"])
    assert 0 < expires - int(datetime.now(UTC).timestamp()) <= 24 * 60 * 60

    app = FastAPI()
    app.include_router(version_router)
    async with original_client(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as web:
        before = len(requests)
        tampered = await web.get(link.path, params={**params, "artifact": "23"})
        assert tampered.status_code == 404
        past = int(datetime.now(UTC).timestamp()) - 1
        expired = await web.get(
            link.path,
            params={**params, "expires": past, "token": signature(4, 22, past)},
        )
        assert expired.status_code == 404
        assert len(requests) == before

        # The recipient uses the shared URL without a Rockit or GitHub session.
        download = await web.get(link.path, params=params)
        assert download.status_code == 200
        assert (
            download.headers["content-disposition"]
            == 'attachment; filename="RockIt-Android-25.apk"'
        )
        with zipfile.ZipFile(io.BytesIO(download.content)) as apk:
            assert "AndroidManifest.xml" in apk.namelist()
    assert list(tmp_path.iterdir()) == []
