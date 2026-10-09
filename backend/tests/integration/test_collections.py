from typing import Any
from collections.abc import Awaitable, Callable

import pytest
from fastapi import FastAPI, Request, Response
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, event, insert
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.collectionAccess import shared_metadata
from backend.core.framework.media.collection import Collection
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.basePlaylistForPlaylistResponse import (
    BasePlaylistForPlaylistResponse,
)
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from backend.core.controllers.collectionController import router
from backend.core.middlewares.authMiddleware import AuthMiddleware
from types import SimpleNamespace

pytestmark = pytest.mark.integration


async def test_page_is_bounded_and_nested_lists_are_unloaded(
    large_playlist: AsyncSession,
) -> None:
    session = large_playlist
    statements: list[str] = []

    def record(
        conn: Connection,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None:
        statements.append(statement)

    assert session.bind is not None
    event.listen(session.bind.sync_engine, "before_cursor_execute", record)
    first = await Collection.page_async(
        session=session, public_id="list-10", user_id=2, limit=25
    )
    assert first.is_ok(), first.info()
    page = first.result()
    assert page.total == 4992
    assert len(page.items) == 25 and page.hasMore
    assert page.items[0].item.publicId == "song-1000"
    query_count = len(statements)
    statements.clear()
    bigger = await Collection.page_async(
        session=session, public_id="list-10", user_id=2, limit=100
    )
    assert bigger.is_ok(), bigger.info()
    assert len(statements) == query_count  # No per-item queries.
    last = await Collection.page_async(
        session=session, public_id="list-10", user_id=2, offset=4990
    )
    assert last.is_ok(), last.info()
    last_page = last.result()
    album_item = last_page.items[0].item
    assert isinstance(album_item, BaseAlbumWithSongsResponse)
    assert album_item.songs == []
    playlist_item = last_page.items[1].item
    assert isinstance(playlist_item, BasePlaylistForPlaylistResponse)
    assert playlist_item.medias == []
    assert not last.result().hasMore
    collection = last_page.collection
    assert isinstance(collection, BasePlaylistWithMediasResponse)
    assert collection.owner.name == "user-1"


async def test_search_finds_unloaded_album_tracks_and_escapes_wildcards(
    large_playlist: AsyncSession,
) -> None:
    result = await Collection.page_async(
        session=large_playlist,
        public_id="list-10",
        user_id=2,
        query="100%_exact",
        limit=1,
    )
    assert result.is_ok(), result.info()
    assert result.result().total == 1
    assert result.result().items[0].item.publicId == "song-5999"
    denied = await Collection.page_async(
        session=large_playlist, public_id="list-12", user_id=2
    )
    assert denied.code() == AResultCode.NOT_FOUND
    allowed = await Collection.page_async(
        session=large_playlist, public_id="list-12", user_id=1
    )
    assert allowed.is_ok(), allowed.info()


async def test_complete_queue_preserves_duplicates_and_skips_cycles(
    large_playlist: AsyncSession,
) -> None:
    result = await Collection.queue_async(
        session=large_playlist,
        public_id="list-10",
        user_id=2,
        start_public_id="song-5999",
    )
    assert result.is_ok(), result.info()
    queue = result.result()
    assert len(queue.queue) == 5001
    assert queue.queue[-1].media.publicId == "song-1000"
    assert queue.currentQueueMediaId == 4999
    assert (
        next(q for q in queue.queue if q.randomIndex == 0).media.publicId == "song-5999"
    )
    assert sorted(q.randomIndex for q in queue.queue) == list(range(5001))
    users, saved = (
        shared_metadata.tables["core.user"],
        shared_metadata.tables["core.user_queue"],
    )
    assert (
        await large_playlist.execute(
            select(users.c.current_queue_id).where(users.c.id == 2)
        )
    ).scalar_one() == 4999
    assert (
        await large_playlist.execute(
            select(saved.c.list_media_id).where(saved.c.user_id == 2).limit(1)
        )
    ).scalar_one() == 10
    invalid = await Collection.queue_async(
        session=large_playlist,
        public_id="list-10",
        user_id=2,
        start_public_id="missing",
    )
    assert invalid.code() == AResultCode.BAD_REQUEST
    assert (
        await large_playlist.execute(
            select(users.c.current_queue_id).where(users.c.id == 2)
        )
    ).scalar_one() == 4999


async def test_disabled_entries_and_album_order(large_playlist: AsyncSession) -> None:
    tables = shared_metadata.tables
    membership = (
        await large_playlist.execute(
            select(tables["default_schema.playlist_media"].c.id).where(
                tables["default_schema.playlist_media"].c.playlist_id == 10,
                tables["default_schema.playlist_media"].c.media_id == 1000,
            )
        )
    ).scalar_one()
    await large_playlist.execute(
        insert(tables["default_schema.user_disabled_playlist_media"]),
        dict(user_id=2, playlist_media_id=membership),
    )
    await large_playlist.commit()
    result = await Collection.page_async(
        session=large_playlist, public_id="list-10", user_id=2, limit=1
    )
    assert result.is_ok(), result.info()
    assert result.result().items[0].item.publicId == "song-1001"
    album = await Collection.page_async(
        session=large_playlist, public_id="album", user_id=2, offset=8, limit=2
    )
    assert album.is_ok(), album.info()
    assert [i.item.publicId for i in album.result().items] == ["song-5998", "song-5999"]
    assert album.result().total == 10 and not album.result().hasMore


async def test_http_contract_validates_limits_and_access(
    large_playlist: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    app = FastAPI()
    app.include_router(router)
    from backend.core.controllers.mediaController import router as media_router

    app.include_router(media_router)
    from backend.default.controllers.playlistController import router as default_router

    app.include_router(default_router)
    app.dependency_overrides[AuthMiddleware.auth_dependency] = lambda: None

    def current_user(request: Request) -> AResult[SimpleNamespace]:
        return AResult(code=AResultCode.OK, message="OK", result=SimpleNamespace(id=2))

    monkeypatch.setattr(AuthMiddleware, "get_current_user", current_user)

    async def db_session(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request.state.db = large_playlist
        return await call_next(request)

    app.middleware("http")(db_session)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        for query in ["limit=0", "limit=201", "offset=-1", "query=" + "a" * 201]:
            assert (
                await client.get("/media/collection/list-10/items?" + query)
            ).status_code == 422
        response = await client.get(
            "/media/collection/list-10/items?offset=4990&limit=2"
        )
        assert response.status_code == 200, response.text
        assert response.json()["collection"]["medias"] == []
        assert len(response.json()["items"]) == 2
        assert (await client.get("/media/collection/list-12/items")).status_code == 404
        metadata = await client.get("/media/list-10")
        assert metadata.status_code == 200, metadata.text
        assert metadata.json()["media"]["medias"] == []
        default_page = await client.get("/default/playlist/list-10?offset=4990&limit=2")
        assert default_page.status_code == 200, default_page.text
        assert len(default_page.json()["medias"]) == 2
        assert default_page.json()["total"] == 4992
        playlist = await client.get("/media/playlist/list-10?offset=4990&limit=2")
        assert playlist.status_code == 200, playlist.text
        assert playlist.json()["total"] == 4992
        assert playlist.json()["medias"][0]["item"]["songs"] == []
        album = await client.get("/media/album/album?offset=8&limit=2")
        assert album.status_code == 200, album.text
        assert len(album.json()["songs"]) == 2
        assert album.json()["total"] == 10


async def test_queue_reload_keeps_complete_scope_and_parent_ids(
    large_playlist: AsyncSession,
) -> None:
    from backend.core.framework.user.user import User

    created = await Collection.queue_async(
        session=large_playlist, public_id="list-10", user_id=2
    )
    assert created.is_ok(), created.info()
    reloaded = await User.get_user_queue_async(session=large_playlist, user_id=2)
    assert reloaded.is_ok(), reloaded.info()
    assert len(reloaded.result().queue) == 5001
    assert all(item.listPublicId == "list-10" for item in reloaded.result().queue)
    assert [item.media.publicId for item in reloaded.result().queue] == [
        item.media.publicId for item in created.result().queue
    ]


async def test_empty_pages_expansion_state_and_contributor_access(
    large_playlist: AsyncSession,
) -> None:
    tables = shared_metadata.tables
    empty = await Collection.page_async(
        session=large_playlist, public_id="list-10", user_id=2, offset=10000
    )
    assert empty.is_ok(), empty.info()
    assert empty.result().items == [] and not empty.result().hasMore
    album_member = (
        await large_playlist.execute(
            select(tables["default_schema.playlist_media"].c.id).where(
                tables["default_schema.playlist_media"].c.playlist_id == 10,
                tables["default_schema.playlist_media"].c.media_id == 20,
            )
        )
    ).scalar_one()
    await large_playlist.execute(
        insert(tables["default_schema.user_playlist_media_expanded"]),
        dict(
            user_id=2, playlist_id=10, playlist_media_id=album_member, is_expanded=True
        ),
    )
    await large_playlist.execute(
        insert(tables["default_schema.playlist_contributor"]),
        dict(user_id=2, playlist_id=12, role_key=2),
    )
    await large_playlist.commit()
    page = await Collection.page_async(
        session=large_playlist, public_id="list-10", user_id=2, offset=4990, limit=1
    )
    assert page.is_ok(), page.info()
    assert page.result().items[0].expanded
    album_item = page.result().items[0].item
    assert isinstance(album_item, BaseAlbumWithSongsResponse)
    assert album_item.songs == []
    accessible = await Collection.page_async(
        session=large_playlist, public_id="list-12", user_id=2
    )
    assert accessible.is_ok(), accessible.info()
    collection = accessible.result().collection
    assert isinstance(collection, BasePlaylistWithMediasResponse)
    assert collection.contributors[0].username == "user-2"


async def test_video_pages_and_queues_use_the_same_order(
    database: AsyncSession,
) -> None:
    tables = shared_metadata.tables
    await database.execute(
        insert(tables["core.media"]),
        dict(id=10, public_id="videos", provider_id=1, media_type_key=3),
    )
    await database.execute(
        insert(tables["default_schema.playlist"]),
        dict(id=10, name="Videos", owner_id=1, image_id=1),
    )
    await database.execute(
        insert(tables["core.media"]),
        [
            dict(id=i, public_id=f"video-{i}", provider_id=2, media_type_key=5)
            for i in (100, 101)
        ],
    )
    await database.execute(
        insert(tables["rockit.video"]),
        [
            dict(
                id=i,
                name=f"Video {i}",
                duration_ms=1000,
                file_path=f"{i}.mp4",
                image_id=1,
            )
            for i in (100, 101)
        ],
    )
    await database.execute(
        insert(tables["default_schema.playlist_media"]),
        [
            dict(playlist_id=10, media_id=101, position=0),
            dict(playlist_id=10, media_id=100, position=1),
        ],
    )
    await database.commit()
    page = await Collection.page_async(
        session=database, public_id="videos", user_id=2, limit=1
    )
    assert page.is_ok(), page.info()
    assert page.result().items[0].item.publicId == "video-101"
    queue = await Collection.queue_async(
        session=database, public_id="videos", user_id=2
    )
    assert queue.is_ok(), queue.info()
    assert [item.media.publicId for item in queue.result().queue] == [
        "video-101",
        "video-100",
    ]
