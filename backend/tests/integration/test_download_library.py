"""Group library actions must include tracks beyond the visible preview."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResultCode
from backend.core.access.db.shared_metadata import shared_metadata
from backend.core.access.downloadBrowseAccess import DownloadBrowseAccess
from backend.core.framework.downloader.downloadBrowser import DownloadBrowser
from backend.core.framework.user.user import SendToUser

pytestmark = pytest.mark.integration


@pytest.mark.parametrize("source_public_id", ["source", None])
async def test_group_library_saves_whole_source_or_all_legacy_tracks(
    database: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    source_public_id: str | None,
) -> None:
    session = database
    tables = shared_metadata.tables
    monkeypatch.setattr(SendToUser, "send_to_user", AsyncMock())
    await session.execute(
        insert(tables["core.download_status_enum"]),
        [dict(key=i, value=str(i)) for i in range(1, 5)],
    )
    await session.execute(
        insert(tables["core.media"]),
        [dict(id=100, public_id="source", provider_id=1, media_type_key=3)]
        + [
            dict(id=i, public_id=f"song-{i}", provider_id=2, media_type_key=4)
            for i in range(200, 260)
        ],
    )
    now = datetime.now(timezone.utc)
    await session.execute(
        insert(tables["core.download_group"]),
        dict(
            id=100,
            public_id="group",
            user_id=1,
            title="Collection",
            date_started=now,
            source_public_id=source_public_id,
        ),
    )
    await session.execute(
        insert(tables["core.download"]),
        [
            dict(
                public_id=f"download-{i}",
                download_group_id=100,
                media_id=i,
                date_started=now,
                status_key=3,
            )
            for i in range(200, 260)
        ],
    )
    await session.commit()
    denied = await DownloadBrowser.group_action_async(
        session=session, user_id=2, public_id="group", action="library"
    )
    assert denied.code() == AResultCode.NOT_FOUND
    before = await DownloadBrowseAccess.groups_async(
        session=session, user_id=1, page=0, status="all", kind="all", query=""
    )
    assert before.is_ok(), before.info()
    assert before.result()[0]["in_library"] is False
    for _ in range(2):  # Repeating the action must not duplicate library entries.
        result = await DownloadBrowser.group_action_async(
            session=session, user_id=1, public_id="group", action="library"
        )
        assert result.is_ok(), result.info()
        await session.commit()
    library = tables["core.user_library_media"]
    saved = set((await session.execute(select(library.c.media_id))).scalars())
    assert saved == ({100} if source_public_id else set(range(200, 260)))
    page = await DownloadBrowseAccess.groups_async(
        session=session, user_id=1, page=0, status="all", kind="all", query=""
    )
    assert page.is_ok(), page.info()
    assert page.result()[0]["in_library"] is True
    assert page.result()[0]["total"] == 60
