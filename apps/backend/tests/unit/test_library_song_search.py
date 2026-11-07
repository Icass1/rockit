"""Run the actual recursive access query against an isolated SQL fixture graph."""

import unicodedata
from collections.abc import Iterator
from datetime import datetime
from typing import Any
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    MetaData,
    String,
    Table,
    create_engine,
    literal,
    select,
    union_all,
)
from sqlalchemy.engine import Connection, CursorResult
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Executable
from sqlalchemy.sql.selectable import CompoundSelect

import core.access.collectionAccess as collection_access
import core.access.librarySearchAccess as library_access
import default.access.collectionSource as default_source
from core.access.adminSearchAccess import AdminSearchAccess
from core.access.collectionCatalog import CollectionCatalog, CollectionCatalogSource
from core.access.librarySearchAccess import LibrarySearchAccess
from core.framework.user.librarySearch import LibrarySearch
from result import Result, ResultCode

pytestmark = pytest.mark.unit
Graph = tuple[AsyncMock, Connection, Table]


@pytest.fixture
def graph(monkeypatch: pytest.MonkeyPatch) -> Iterator[Graph]:
    """Include duplicate paths, cycles, private collections, and disabled memberships."""
    metadata = MetaData()
    media = Table(
        "media",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("public_id", String),
        Column("provider_id", Integer),
        Column("media_type_key", Integer),
        Column("date_added", DateTime),
        schema="core",
    )
    library = Table(
        "user_library_media",
        metadata,
        Column("user_id", Integer),
        Column("media_id", Integer),
        schema="core",
    )
    albums = Table(
        "album", metadata, Column("id", Integer), Column("name", String), schema="fixture"
    )
    songs = Table(
        "song",
        metadata,
        Column("id", Integer),
        Column("album_id", Integer),
        Column("name", String),
        Column("artist", String),
        Column("date_added", DateTime),
        schema="fixture",
    )
    playlists = Table(
        "playlist",
        metadata,
        Column("id", Integer),
        Column("name", String),
        Column("owner_id", Integer),
        Column("is_public", Boolean),
        schema="default_schema",
    )
    membership = Table(
        "playlist_media",
        metadata,
        Column("id", Integer),
        Column("playlist_id", Integer),
        Column("media_id", Integer),
        Column("position", Integer),
        Column("disabled", Boolean),
        Column("date_added", DateTime),
        schema="default_schema",
    )
    contributors = Table(
        "playlist_contributor",
        metadata,
        Column("playlist_id", Integer),
        Column("user_id", Integer),
        schema="default_schema",
    )
    disabled = Table(
        "user_disabled_playlist_media",
        metadata,
        Column("playlist_media_id", Integer),
        Column("user_id", Integer),
        schema="default_schema",
    )
    monkeypatch.setattr(collection_access, "shared_metadata", metadata)
    monkeypatch.setattr(library_access, "shared_metadata", metadata)
    monkeypatch.setattr(default_source, "shared_metadata", metadata)
    monkeypatch.setattr(
        collection_access, "collection_sources", [default_source.DefaultCollectionSource()]
    )
    monkeypatch.setattr(
        AdminSearchAccess,
        "get_search_index_fragment",
        lambda: (
            """
        SELECT id AS internal_id, name, artist AS subtitle, 4 AS media_type_key,
               '' AS public_id, '' AS provider_name, NULL AS image_id FROM fixture.song
    """
        ),
    )
    catalog = CollectionCatalog()

    def metadata_statement() -> CompoundSelect[Any]:
        return union_all(
            *[
                select(t.c.id, t.c.name, literal(None).label("image_id"))
                for t in (albums, songs, playlists)
            ]
        )

    def edge_statement(user_id: int) -> CompoundSelect[Any]:
        album_edges = select(
            songs.c.album_id.label("parent_id"),
            songs.c.id.label("media_id"),
            songs.c.id.label("position"),
            songs.c.date_added.label("added_at"),
        ).where(songs.c.album_id.is_not(None))
        playlist_edges = select(
            membership.c.playlist_id.label("parent_id"),
            membership.c.media_id,
            membership.c.position,
            membership.c.date_added.label("added_at"),
        ).where(membership.c.disabled.is_(False))
        return union_all(
            album_edges,
            default_source.DefaultCollectionSource.filter_edges(
                playlist_edges, membership, user_id
            ),
        )

    catalog.register(
        CollectionCatalogSource(
            key="opaque-fixture", metadata=metadata_statement, edges=edge_statement
        )
    )
    monkeypatch.setattr(collection_access, "collection_catalog", catalog)
    engine = create_engine("sqlite://")
    with engine.connect() as connection:
        for schema in ("core", "fixture", "default_schema"):
            connection.exec_driver_sql(f"ATTACH DATABASE ':memory:' AS {schema}")
        raw = connection.connection.driver_connection
        assert raw is not None

        def translate(value: str, source: str, target: str) -> str:
            return value.translate(str.maketrans(source, target))

        def lower(value: str | None) -> str | None:
            return value.lower() if value else value

        def concat(separator: str, *values: str | None) -> str:
            return separator.join(v for v in values if v is not None)

        raw.create_function("translate", 3, translate)
        raw.create_function("lower", 1, lower)

        def normalize(value: str) -> str:
            return unicodedata.normalize("NFC", value)

        raw.create_function("normalize", 1, normalize)
        raw.create_function("concat_ws", -1, concat)
        metadata.create_all(connection)
        now = datetime(2026, 1, 1)
        types = {
            1: 2,
            2: 3,
            3: 4,
            4: 4,
            5: 4,
            6: 3,
            7: 3,
            8: 4,
            9: 2,
            10: 4,
            11: 2,
            12: 4,
            13: 4,
            14: 4,
        }
        connection.execute(
            media.insert(),
            [
                dict(
                    id=id,
                    public_id=f"song-{id}" if kind == 4 else f"collection-{id}",
                    provider_id=1,
                    media_type_key=kind,
                    date_added=now,
                )
                for id, kind in types.items()
            ],
        )
        connection.execute(albums.insert(), [dict(id=id, name="Album") for id in (1, 9, 11)])
        connection.execute(
            songs.insert(),
            [
                dict(
                    id=3,
                    album_id=1,
                    name="The Contract",
                    artist="twenty one pilots",
                    date_added=now,
                ),
                dict(
                    id=4,
                    album_id=1,
                    name="E\u0301te\u0301 d’amour",
                    artist="Beyoncé",
                    date_added=now,
                ),
                *[
                    dict(
                        id=id,
                        album_id=9 if id == 10 else 11 if id == 12 else None,
                        name=f"Song {id}",
                        artist="Artist",
                        date_added=now,
                    )
                    for id in (5, 8, 10, 12, 13, 14)
                ],
            ],
        )
        connection.execute(
            playlists.insert(),
            [
                dict(id=id, name="Playlist", owner_id=1 if id == 2 else 2, is_public=id == 7)
                for id in (2, 6, 7)
            ],
        )
        connection.execute(
            library.insert(),
            [dict(user_id=1, media_id=id) for id in (1, 2, 3, 6)] + [dict(user_id=2, media_id=11)],
        )
        edges = [(2, 3), (2, 6), (6, 5), (2, 7), (7, 2), (7, 8), (2, 9), (2, 13), (2, 14)]
        connection.execute(
            membership.insert(),
            [
                dict(
                    id=i,
                    playlist_id=parent,
                    media_id=child,
                    position=i,
                    disabled=child == 14,
                    date_added=now,
                )
                for i, (parent, child) in enumerate(edges, 1)
            ],
        )
        connection.execute(disabled.insert(), dict(playlist_media_id=8, user_id=1))
        session = AsyncMock(spec=AsyncSession)

        async def execute(statement: Executable) -> CursorResult[Any]:
            return connection.execute(statement)

        session.execute.side_effect = execute
        yield session, connection, contributors
    engine.dispose()


async def test_album_playlist_and_direct_song_are_deduplicated_before_pagination(
    graph: Graph,
) -> None:
    session, _, _ = graph
    response = await LibrarySearchAccess.songs_async(
        session=session, user_id=1, query="the contract", offset=0, limit=1
    )
    assert response.is_ok(), response.info()
    records, total = response.result()
    assert total == 1
    assert [record.public_id for record in records] == ["song-3"]
    assert session.execute.await_count == 2


async def test_nested_collections_cycles_private_roots_and_disabled_edges(graph: Graph) -> None:
    session, _, _ = graph
    first = await LibrarySearchAccess.songs_async(
        session=session, user_id=1, query="song", offset=0, limit=1
    )
    second = await LibrarySearchAccess.songs_async(
        session=session, user_id=1, query="song", offset=1, limit=1
    )
    assert first.is_ok(), first.info()
    assert second.is_ok(), second.info()
    assert first.result()[1] == second.result()[1] == 2
    assert {first.result()[0][0].public_id, second.result()[0][0].public_id} == {
        "song-8",
        "song-10",
    }


async def test_granted_and_revoked_private_playlist_access_is_applied_at_each_search(
    graph: Graph,
) -> None:
    session, connection, contributors = graph
    connection.execute(contributors.insert(), dict(playlist_id=6, user_id=1))
    found = await LibrarySearchAccess.songs_async(
        session=session, user_id=1, query="song 5", offset=0, limit=50
    )
    assert found.is_ok(), found.info()
    assert [record.public_id for record in found.result()[0]] == ["song-5"]
    connection.execute(contributors.delete())
    revoked = await LibrarySearchAccess.songs_async(
        session=session, user_id=1, query="song 5", offset=0, limit=50
    )
    assert revoked.is_ok() and revoked.result()[1] == 0


@pytest.mark.parametrize(
    "query", ["ete d'amour", "ÉTÉ D’AMOUR", "beyonce", "contract twenty", "   ", "%", "_"]
)
async def test_unicode_artist_tokens_and_literal_wildcards(graph: Graph, query: str) -> None:
    session, _, _ = graph
    found = await LibrarySearchAccess.songs_async(
        session=session, user_id=1, query=query, offset=0, limit=50
    )
    assert found.is_ok(), found.info()
    expected = 0 if query in ("   ", "%", "_") else 1
    assert found.result()[1] == expected


async def test_other_users_library_is_not_searched(graph: Graph) -> None:
    session, _, _ = graph
    found = await LibrarySearchAccess.songs_async(
        session=session, user_id=2, query="song", offset=0, limit=50
    )
    assert found.is_ok(), found.info()
    assert [record.public_id for record in found.result()[0]] == ["song-12"]


async def test_access_failure_never_calls_a_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    from core.framework import providers

    monkeypatch.setattr(
        LibrarySearchAccess,
        "songs_async",
        AsyncMock(return_value=Result(code=ResultCode.GENERAL_ERROR, message="offline")),
    )
    lookup = AsyncMock()
    monkeypatch.setattr(providers, "find_media_provider", lookup)
    found = await LibrarySearch.songs_async(
        session=AsyncMock(spec=AsyncSession), user_id=1, query="song"
    )
    assert found.is_not_ok()
    lookup.assert_not_called()


async def test_hydration_is_batched_per_provider_and_preserves_page_order(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from types import SimpleNamespace

    from core.framework import providers
    from core.framework.models.collection import CollectionRecord
    from core.responses.baseAlbumWithoutSongsResponse import BaseAlbumWithoutSongsResponse
    from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse

    album = BaseAlbumWithoutSongsResponse(
        provider="fixture",
        publicId="album",
        name="Album",
        url="/album/album",
        providerUrl="",
        artists=[],
        releaseDate="",
        imageUrl="cover",
        dominantColor="",
    )

    def song(id: str) -> BaseSongWithAlbumResponse:
        return BaseSongWithAlbumResponse(
            provider="fixture",
            publicId=id,
            providerUrl="",
            name=id,
            artists=[],
            audioUrl=None,
            downloaded=False,
            imageUrl="cover",
            dominantColor="",
            duration_ms=1000,
            discNumber=1,
            trackNumber=1,
            album=album,
        )

    records = [
        CollectionRecord(
            id=i,
            public_id=f"song-{i}",
            provider_id=1 if i != 2 else 2,
            media_type_key=4,
            name="Song",
        )
        for i in (1, 2, 3)
    ]
    monkeypatch.setattr(
        LibrarySearchAccess,
        "songs_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=(records, 10))),
    )
    first = SimpleNamespace(
        get_songs_async=AsyncMock(
            return_value=Result(
                code=ResultCode.OK, message="OK", result=[song("song-3"), song("song-1")]
            )
        )
    )
    second = SimpleNamespace(
        get_songs_async=AsyncMock(
            return_value=Result(code=ResultCode.OK, message="OK", result=[song("song-2")])
        )
    )

    def lookup(provider_id: int) -> SimpleNamespace:
        return first if provider_id == 1 else second

    monkeypatch.setattr(providers, "find_media_provider", lookup)
    session = AsyncMock(spec=AsyncSession)
    found = await LibrarySearch.songs_async(
        session=session, user_id=1, query="song", offset=3, limit=3
    )
    assert found.is_ok(), found.info()
    page = found.result()
    assert [song.publicId for song in page.songs] == ["song-1", "song-2", "song-3"]
    assert page.total == 10 and page.hasMore and page.offset == 3
    first.get_songs_async.assert_awaited_once_with(session=session, public_ids=["song-1", "song-3"])
    second.get_songs_async.assert_awaited_once_with(session=session, public_ids=["song-2"])
