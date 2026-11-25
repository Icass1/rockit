from datetime import UTC, datetime
from typing import cast
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.userRequest import UserRequestRow
from core.access.notificationAccess import NotificationAccess
from core.access.requestAccess import RequestAccess
from core.enums.requestStatusEnum import RequestStatusEnum
from core.enums.requestTypeEnum import RequestTypeEnum
from core.framework.admin.androidBuilds import AndroidBuilds
from core.framework.admin.metadataReview import MetadataReview
from core.framework.admin.userRequest import UserRequest
from result import Result, ResultCode


def test_metadata_validation_does_not_silently_drop_fields() -> None:
    result = MetadataReview.changes(
        RequestTypeEnum.METADATA,
        '{"title":" New name ","releaseDate":"2026-11-24","explicit":"clean"}',
    )
    assert result.is_ok()
    assert result.result() == {"title": "New name", "releaseDate": "2026-11-24"}
    for payload in ['{"unknown":"Rock"}', '{"title":""}', '{"releaseDate":"2026-02-31"}', "{}"]:
        assert MetadataReview.changes(RequestTypeEnum.METADATA, payload).is_not_ok()


async def test_failed_metadata_application_never_marks_request_accepted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    row = UserRequestRow(
        id=3,
        user_id=1,
        media_id=2,
        request_type_key=RequestTypeEnum.METADATA.value,
        proposed_value='{"title":"New name"}',
        public_id="request",
    )
    row.status_key = RequestStatusEnum.PENDING.value
    monkeypatch.setattr(
        RequestAccess,
        "get_request_by_public_id_async",
        AsyncMock(return_value=Result[UserRequestRow].ok(row)),
    )
    monkeypatch.setattr(
        MetadataReview,
        "apply_async",
        AsyncMock(return_value=Result[bool](ResultCode.BAD_REQUEST, "Unsupported provider")),
    )
    update = AsyncMock()
    monkeypatch.setattr(RequestAccess, "update_request_status_async", update)
    result = await UserRequest.review_request_async(
        cast(AsyncSession, object()), "request", 1, RequestStatusEnum.ACCEPTED
    )
    assert result.is_not_ok()
    update.assert_not_awaited()


async def test_admin_notification_targets_only_admin_query_and_does_not_commit() -> None:
    session = MagicMock(spec=AsyncSession)
    session.scalars = AsyncMock(return_value=[1, 7])
    session.flush = AsyncMock()
    result = await NotificationAccess.deliver_admin_request_async(cast(AsyncSession, session))
    assert result.is_ok() and result.result() == [1, 7]
    query = str(session.scalars.call_args.args[0])
    assert '"user".admin IS true' in query
    assert '"user".super_admin IS true' in query
    rows = session.add_all.call_args.args[0]
    assert {row.user_id for row in rows} == {1, 7}
    assert all(row.destination == {"path": "/admin?tab=requests"} for row in rows)
    session.commit.assert_not_called()


async def test_github_history_preserves_runs_and_omits_expired_downloads(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    run = {
        "id": 4,
        "run_number": 25,
        "head_branch": "develop",
        "head_sha": "abcdef123456",
        "status": "completed",
        "conclusion": "success",
        "created_at": datetime.now(UTC).isoformat(),
        "html_url": "https://github.com/Icass1/rockit/actions/runs/4",
    }

    async def get(_self: object, url: str, **_kwargs: object) -> httpx.Response:
        body = (
            {
                "artifacts": [
                    {
                        "id": 22,
                        "name": "RockIt-Android-preview-25",
                        "expired": True,
                        "expires_at": "2026-11-01T00:00:00Z",
                        "workflow_run": {"id": 4},
                    }
                ]
            }
            if url.endswith("/artifacts")
            else {"workflow_runs": [run]}
        )
        return httpx.Response(200, json=body, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", get)
    result = await AndroidBuilds.history_async()
    assert result.is_ok()
    build = result.result().builds[0]
    assert build.expired and build.artifactUrl is None
    assert build.commit == "abcdef1" and build.number == 25


async def test_github_permission_failure_is_explicit_and_has_workflow_link(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def get(_self: object, url: str, **_kwargs: object) -> httpx.Response:
        return httpx.Response(403, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", get)
    result = await AndroidBuilds.history_async()
    assert result.is_ok()
    assert result.result().availability == "unavailable"
    assert result.result().workflowUrl.startswith("https://github.com/")


def test_generated_nullable_defaults_accept_older_cached_media() -> None:
    from pydantic import BaseModel

    from core.utils.zodGenerator import generate_zod_schema

    class CachedMedia(BaseModel):
        genre: str | None = None
        requiredTitle: str

    schema, _, _ = generate_zod_schema(CachedMedia, {}, {}, "cachedMedia.ts")
    assert "genre: z.string().nullable().default(null)" in schema
    assert "requiredTitle: z.string()" in schema
