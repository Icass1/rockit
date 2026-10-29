"""Personal pin persistence and permissions with isolated SQL/HTTP fixtures."""

from collections.abc import Iterator
from typing import Any, cast
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    MetaData,
    String,
    Table,
    create_engine,
    func,
    select,
    union_all,
)
from sqlalchemy.engine import Connection, CursorResult
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Executable
from sqlalchemy.sql.selectable import CompoundSelect

import core.access.collectionAccess as collection_access
import core.access.navigationPinAccess as pin_access
import default.access.collectionSource as default_source
from core.access.collectionCatalog import CollectionCatalog, CollectionCatalogSource
from core.access.db.ormModels.user_navigation_list_pin import UserNavigationListPinRow
from core.access.db.ormModels.user_navigation_pin import UserNavigationPinRow
from core.access.navigationPinAccess import NavigationPinAccess
from core.framework import providers
from core.framework.media.image import Image
from core.framework.user.navigationPins import NavigationPins
from core.models.navigationPin import NavigationPinRecord
from featured.framework.provider.featuredProvider import FeaturedProvider
from result import Result, ResultCode

pytestmark = pytest.mark.unit
Graph = tuple[AsyncMock, Connection, MetaData]


@pytest.fixture(autouse=True)
def navigation_sources(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(providers, "_providers", [FeaturedProvider()])


@pytest.fixture
def graph(monkeypatch: pytest.MonkeyPatch) -> Iterator[Graph]:
    metadata = MetaData()
    user = Table("user", metadata, Column("id", Integer, primary_key=True), schema="core")
    media = Table(
        "media",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("public_id", String),
        Column("media_type_key", Integer),
        schema="core",
    )
    album = Table(
        "album",
        metadata,
        Column("id", Integer),
        Column("name", String),
        Column("image_id", Integer),
        schema="fixture",
    )
    artist = Table(
        "artist",
        metadata,
        Column("id", Integer),
        Column("name", String),
        Column("image_id", Integer),
        schema="fixture",
    )
    playlist = Table(
        "playlist",
        metadata,
        Column("id", Integer),
        Column("name", String),
        Column("image_id", Integer),
        Column("owner_id", Integer),
        Column("is_public", Boolean),
        schema="default_schema",
    )
    Table(
        "playlist_contributor",
        metadata,
        Column("playlist_id", Integer),
        Column("user_id", Integer),
        schema="default_schema",
    )
    Table(
        "playlist_media",
        metadata,
        Column("id", Integer),
        Column("playlist_id", Integer),
        Column("media_id", Integer),
        Column("position", Integer),
        Column("date_added", String),
        schema="default_schema",
    )
    Table(
        "user_disabled_playlist_media",
        metadata,
        Column("user_id", Integer),
        Column("playlist_media_id", Integer),
        schema="default_schema",
    )
    monkeypatch.setattr(pin_access, "shared_metadata", metadata)
    monkeypatch.setattr(collection_access, "shared_metadata", metadata)
    monkeypatch.setattr(default_source, "shared_metadata", metadata)
    monkeypatch.setattr(
        collection_access, "collection_sources", [default_source.DefaultCollectionSource()]
    )
    catalog = CollectionCatalog()

    def metadata_statement() -> CompoundSelect[Any]:
        return union_all(
            *[select(t.c.id, t.c.name, t.c.image_id) for t in (album, artist, playlist)]
        )

    catalog.register(CollectionCatalogSource(key="fixture", metadata=metadata_statement))
    monkeypatch.setattr(pin_access, "collection_catalog", catalog)
    monkeypatch.setattr(collection_access, "collection_catalog", catalog)
    engine = create_engine("sqlite://")
    with engine.connect() as connection:
        connection.exec_driver_sql("PRAGMA foreign_keys=ON")
        for schema in ("core", "fixture", "default_schema"):
            connection.exec_driver_sql(f"ATTACH DATABASE ':memory:' AS {schema}")
        metadata.create_all(connection)
        cast(Table, UserNavigationPinRow.__table__).create(connection)
        cast(Table, UserNavigationListPinRow.__table__).create(connection)
        connection.execute(user.insert(), [dict(id=1), dict(id=2), dict(id=3)])
        connection.execute(
            media.insert(),
            [
                dict(id=1, public_id="album", media_type_key=2),
                dict(id=2, public_id="artist", media_type_key=1),
                dict(id=3, public_id="playlist", media_type_key=3),
                dict(id=4, public_id="song", media_type_key=4),
            ],
        )
        connection.execute(album.insert(), dict(id=1, name="Stadium Arcadium", image_id=10))
        connection.execute(artist.insert(), dict(id=2, name="Red Hot Chili Peppers", image_id=20))
        connection.execute(
            playlist.insert(),
            dict(id=3, name="Private playlist", image_id=None, owner_id=1, is_public=False),
        )
        session = AsyncMock(spec=AsyncSession)

        async def execute(statement: Executable) -> CursorResult[Any]:
            return connection.execute(statement)

        session.execute.side_effect = execute
        yield session, connection, metadata
    engine.dispose()


async def test_supported_pins_are_idempotent_and_do_not_require_library_membership(
    graph: Graph,
) -> None:
    session, connection, _ = graph
    for public_id in ("album", "artist", "playlist", "album"):
        result = await NavigationPinAccess.add_async(
            session=session, user_id=1, public_id=public_id
        )
        assert result.is_ok(), result.info()
    assert (
        connection.execute(
            select(func.count()).select_from(UserNavigationPinRow.__table__)
        ).scalar_one()
        == 3
    )
    result = await NavigationPinAccess.list_async(session=session, user_id=1)
    assert result.is_ok(), result.info()
    assert {item.public_id for item in result.result()} == {"album", "artist", "playlist"}
    assert {item.name for item in result.result()} >= {"Stadium Arcadium", "Red Hot Chili Peppers"}


@pytest.mark.parametrize("public_id", ["song", "missing", "playlist"])
async def test_song_missing_and_inaccessible_private_playlist_cannot_be_pinned(
    graph: Graph, public_id: str
) -> None:
    session, connection, _ = graph
    result = await NavigationPinAccess.add_async(session=session, user_id=2, public_id=public_id)
    assert result.code() == ResultCode.NOT_FOUND
    assert (
        connection.execute(
            select(func.count()).select_from(UserNavigationPinRow.__table__)
        ).scalar_one()
        == 0
    )


async def test_revoked_access_hides_pin_and_unpin_still_works(graph: Graph) -> None:
    session, connection, metadata = graph
    contributors = metadata.tables["default_schema.playlist_contributor"]
    connection.execute(contributors.insert(), dict(playlist_id=3, user_id=2))
    added = await NavigationPinAccess.add_async(session=session, user_id=2, public_id="playlist")
    assert added.is_ok(), added.info()
    visible = await NavigationPinAccess.list_async(session=session, user_id=2)
    assert visible.is_ok() and len(visible.result()) == 1
    connection.execute(contributors.delete())
    hidden = await NavigationPinAccess.list_async(session=session, user_id=2)
    assert hidden.is_ok() and hidden.result() == []
    removed = await NavigationPinAccess.remove_async(
        session=session, user_id=2, public_id="playlist"
    )
    assert removed.is_ok()
    assert (
        connection.execute(
            select(func.count()).select_from(UserNavigationPinRow.__table__)
        ).scalar_one()
        == 0
    )


async def test_unpin_is_personal_and_never_deletes_media(graph: Graph) -> None:
    session, connection, metadata = graph
    for user_id in (1, 2):
        added = await NavigationPinAccess.add_async(
            session=session, user_id=user_id, public_id="album"
        )
        assert added.is_ok(), added.info()
    removed = await NavigationPinAccess.remove_async(session=session, user_id=1, public_id="album")
    assert removed.is_ok()
    first = await NavigationPinAccess.list_async(session=session, user_id=1)
    other = await NavigationPinAccess.list_async(session=session, user_id=2)
    assert first.is_ok() and first.result() == []
    assert other.is_ok() and [item.public_id for item in other.result()] == ["album"]
    assert (
        connection.execute(
            select(func.count()).select_from(metadata.tables["core.media"])
        ).scalar_one()
        == 4
    )


async def test_deleting_media_or_user_cascades_only_their_pin_references(graph: Graph) -> None:
    session, connection, metadata = graph
    for public_id in ("album", "artist"):
        added = await NavigationPinAccess.add_async(session=session, user_id=1, public_id=public_id)
        assert added.is_ok(), added.info()
    connection.execute(
        metadata.tables["core.media"]
        .delete()
        .where(metadata.tables["core.media"].c.public_id == "album")
    )
    assert (
        connection.execute(
            select(func.count()).select_from(UserNavigationPinRow.__table__)
        ).scalar_one()
        == 1
    )
    connection.execute(
        metadata.tables["core.user"].delete().where(metadata.tables["core.user"].c.id == 1)
    )
    assert (
        connection.execute(
            select(func.count()).select_from(UserNavigationPinRow.__table__)
        ).scalar_one()
        == 0
    )


async def test_images_are_resolved_once_and_urls_are_canonical(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    entries = [
        NavigationPinRecord(public_id="a", media_type_key=2, name="Album", image_id=10),
        NavigationPinRecord(public_id="b", media_type_key=1, name="Artist", image_id=20),
    ]
    monkeypatch.setattr(
        NavigationPinAccess,
        "list_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=entries)),
    )
    monkeypatch.setattr(
        NavigationPinAccess,
        "list_builtin_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=[])),
    )
    images = AsyncMock(return_value={10: "cover", 20: "portrait"})
    monkeypatch.setattr(Image, "get_internal_image_urls_by_ids_async", images)
    session = AsyncMock(spec=AsyncSession)
    found = await NavigationPins.list_async(session=session, user_id=1)
    assert found.is_ok(), found.info()
    assert [(item.url, item.imageUrl) for item in found.result().pins] == [
        ("/album/a", "cover"),
        ("/artist/b", "portrait"),
    ]
    images.assert_awaited_once_with(session=session, image_ids=[10, 20])


async def test_failed_save_does_not_claim_success_or_load_list(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        NavigationPinAccess,
        "add_async",
        AsyncMock(return_value=Result(code=ResultCode.NOT_FOUND, message="Inaccessible")),
    )
    load = AsyncMock()
    monkeypatch.setattr(NavigationPins, "list_async", load)
    result = await NavigationPins.set_async(
        session=AsyncMock(spec=AsyncSession), user_id=1, public_id="playlist", pinned=True
    )
    assert result.code() == ResultCode.NOT_FOUND
    load.assert_not_awaited()


def test_frontend_pin_account_and_concurrency_regressions() -> None:
    """CI provides Node and the frontend toolchain before pytest."""
    import subprocess
    from pathlib import Path

    root = Path(__file__).resolve().parents[4]
    completed = subprocess.run(
        [
            "node",
            "--test",
            str(root / "apps/web/tests/navigationPins.test.mjs"),
            str(root / "apps/web/tests/contextMenuGestures.test.mjs"),
        ],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr


async def test_rockit_lists_are_personal_idempotent_and_never_reseed_on_read(graph: Graph) -> None:
    defaults = [s.key for s in FeaturedProvider().get_navigation_shortcuts() if s.default]

    session, _, _ = graph
    existing = await NavigationPinAccess.list_builtin_async(session=session, user_id=1)
    assert existing.is_ok() and existing.result() == []
    seeded = await NavigationPinAccess.add_builtins_async(session=session, user_id=1, keys=defaults)
    assert seeded.is_ok(), seeded.info()
    repeated = await NavigationPinAccess.add_builtins_async(
        session=session, user_id=1, keys=defaults
    )
    assert repeated.is_ok()
    found = await NavigationPinAccess.list_builtin_async(session=session, user_id=1)
    assert found.is_ok() and set(found.result()) == {"liked", "most-listened", "recent-mix"}
    removed = await NavigationPinAccess.remove_builtin_async(
        session=session, user_id=1, key="liked"
    )
    assert removed.is_ok()
    for _ in range(2):
        found = await NavigationPinAccess.list_builtin_async(session=session, user_id=1)
        assert found.is_ok() and set(found.result()) == {"most-listened", "recent-mix"}
    other = await NavigationPinAccess.list_builtin_async(session=session, user_id=2)
    assert other.is_ok() and other.result() == []


async def test_rockit_pin_support_does_not_materialize_or_expand_a_playlist(
    graph: Graph, monkeypatch: pytest.MonkeyPatch
) -> None:
    session, connection, metadata = graph
    monkeypatch.setattr(Image, "get_internal_image_urls_by_ids_async", AsyncMock(return_value={}))
    found = await NavigationPins.set_async(
        session=session, user_id=1, public_id="liked", pinned=True
    )
    assert found.is_ok(), found.info()
    assert len(found.result().pins) == 1
    item = found.result().pins[0]
    assert item.builtinKey == "liked" and item.type == "playlist" and item.url == "/playlist/liked"
    assert (
        connection.execute(
            select(func.count()).select_from(metadata.tables["core.media"])
        ).scalar_one()
        == 4
    )
    assert (
        connection.execute(
            select(func.count()).select_from(UserNavigationPinRow.__table__)
        ).scalar_one()
        == 0
    )
    removed = await NavigationPins.set_async(
        session=session, user_id=1, public_id="liked", pinned=False
    )
    assert removed.is_ok() and removed.result().pins == []


async def test_registration_requests_only_the_three_defaults(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from core.access.db.ormModels.user import UserRow
    from core.access.userAccess import UserAccess
    from core.framework.auth.register import Register

    user = UserRow(username="new", image_id=1, id=10)
    monkeypatch.setattr(
        UserAccess,
        "get_user_from_username_async",
        AsyncMock(return_value=Result(code=ResultCode.NOT_FOUND, message="missing")),
    )
    create = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=user))
    monkeypatch.setattr(UserAccess, "create_user_async", create)
    session = AsyncMock(spec=AsyncSession)
    result = await Register.register_user_async(session=session, username="new", password="test")
    assert result.is_ok()
    create.assert_awaited_once_with(
        session=session,
        username="new",
        password="test",
        navigation_defaults=["liked", "most-listened", "recent-mix"],
    )


async def test_default_seed_failure_rolls_back_new_user_before_commit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from types import SimpleNamespace

    from core.access.userAccess import UserAccess, pwd

    def hash_password(secret: str) -> str:
        return "hashed"

    monkeypatch.setattr(pwd, "hash", hash_password)
    monkeypatch.setattr(
        Image,
        "get_image_from_key_async",
        AsyncMock(
            return_value=Result(code=ResultCode.OK, message="OK", result=SimpleNamespace(id=1))
        ),
    )
    failed = AsyncMock(return_value=Result(code=ResultCode.GENERAL_ERROR, message="seed failed"))
    monkeypatch.setattr(NavigationPinAccess, "add_builtins_async", failed)
    session = AsyncMock(spec=AsyncSession)

    async def flush() -> None:
        session.add.call_args.kwargs["instance"].id = 42

    session.flush.side_effect = flush
    result = await UserAccess.create_user_async(
        session=session, username="new", password="test", navigation_defaults=["liked"]
    )
    assert result.is_not_ok() and result.message() == "seed failed"
    session.commit.assert_not_awaited()
    session.rollback.assert_awaited_once()
    failed.assert_awaited_once_with(session=session, user_id=42, keys=["liked"])


async def test_unknown_provider_can_supply_shortcuts_and_registration_defaults(
    graph: Graph,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from core.framework.provider.baseProvider import BaseProvider
    from core.models.navigationPin import NavigationShortcut

    class AnotherProvider(BaseProvider):
        def get_navigation_shortcuts(self) -> list[NavigationShortcut]:
            return [
                NavigationShortcut(
                    key="opaque:custom",
                    name="Personal collection",
                    url="/custom/route",
                    default=True,
                )
            ]

    monkeypatch.setattr(providers, "_providers", [AnotherProvider()])
    session, _, _ = graph
    monkeypatch.setattr(Image, "get_internal_image_urls_by_ids_async", AsyncMock(return_value={}))
    definitions = providers.get_navigation_shortcuts()
    assert definitions.is_ok() and list(definitions.result()) == ["opaque:custom"]
    result = await NavigationPins.set_async(
        session=session, user_id=1, public_id="opaque:custom", pinned=True
    )
    assert result.is_ok(), result.info()
    assert [(p.publicId, p.url, p.name) for p in result.result().pins] == [
        ("opaque:custom", "/custom/route", "Personal collection")
    ]
    monkeypatch.setattr(providers, "_providers", [])
    hidden = await NavigationPins.list_async(session=session, user_id=1)
    assert hidden.is_ok() and hidden.result().pins == []


def test_duplicate_shortcut_keys_fail_instead_of_overriding_another_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(providers, "_providers", [FeaturedProvider(), FeaturedProvider()])
    result = providers.get_navigation_shortcuts()
    assert result.is_not_ok()
