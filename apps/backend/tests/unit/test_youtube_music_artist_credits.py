"""Keep collaboration credits through extraction and persistence."""

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.image import ImageRow
from result import Result, ResultCode
from youtubeMusic.access.db.ormModels.album import AlbumRow
from youtubeMusic.access.db.ormModels.artist import ArtistRow
from youtubeMusic.access.db.ormModels.track import TrackRow
from youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess
from youtubeMusic.framework.download.imageDownload import ImageDownload
from youtubeMusic.framework.youtubeMusic import YoutubeMusic
from youtubeMusic.utils import youtubeMusicApi
from youtubeMusic.utils.youtubeMusicApi import (
    YoutubeMusicApi,
    YoutubeMusicTrack,
    _artist_names,  # pyright: ignore[reportPrivateUsage]
)


@pytest.mark.parametrize(
    "metadata,expected",
    [
        ({"artist": "Dua Lipa", "artists": ["Dua Lipa", "Angèle"]}, ["Dua Lipa", "Angèle"]),
        (
            {"artist": "joined", "artists": [{"name": "Dua Lipa"}, {"name": "Angèle"}]},
            ["Dua Lipa", "Angèle"],
        ),
        ({"artists": ["Dua Lipa", "", "Dua Lipa", None]}, ["Dua Lipa"]),
        ({"artist": "Simon & Garfunkel", "artists": []}, ["Simon & Garfunkel"]),
        ({"artist": None}, []),
    ],
)
def test_individual_credits_take_priority_without_splitting_band_names(
    metadata: dict[str, object], expected: list[str]
) -> None:
    assert _artist_names(info=metadata) == expected


async def test_track_extraction_preserves_both_artists(monkeypatch: pytest.MonkeyPatch) -> None:
    client = MagicMock()
    client.__enter__.return_value = client
    client.extract_info.return_value = {
        "title": "Fever",
        "artist": "Dua Lipa",
        "artists": ["Dua Lipa", "Angèle"],
    }

    def create_client(opts: dict[str, Any]) -> MagicMock:
        return client

    monkeypatch.setattr(youtubeMusicApi, "_create_youtube_dl", create_client)
    result = await YoutubeMusicApi.get_track_info_async(youtube_id="track")
    assert result.is_ok(), result.info()
    assert result.result().artists == ["Dua Lipa", "Angèle"]
    assert client.extract_info.call_args.kwargs["download"] is False


async def test_album_artist_map_does_not_drop_a_track_collaborator(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    lead = cast(ArtistRow, SimpleNamespace(name="Dua Lipa"))
    guest = cast(ArtistRow, SimpleNamespace(name="Angèle"))
    monkeypatch.setattr(
        ImageDownload,
        "download_and_create_internal_image_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK, message="OK", result=cast(ImageRow, SimpleNamespace(id=8))
            )
        ),
    )
    lookup = AsyncMock(
        return_value=Result(code=ResultCode.OK, message="OK", result={"Angèle": guest})
    )
    persist = AsyncMock(
        return_value=Result(
            code=ResultCode.OK, message="OK", result=cast(TrackRow, SimpleNamespace(id=10))
        )
    )
    monkeypatch.setattr(YoutubeMusicAccess, "get_or_create_track_artists_async", lookup)
    monkeypatch.setattr(YoutubeMusicAccess, "get_or_create_track_with_image_id_async", persist)
    artist_map = {"Dua Lipa": lead}
    session = AsyncMock(spec=AsyncSession)
    result = await YoutubeMusic.get_or_create_track_async(
        session=session,
        raw=YoutubeMusicTrack(
            youtube_id="track",
            title="Fever",
            artists=["Dua Lipa", "Angèle"],
            album="Future Nostalgia",
        ),
        artist_map=artist_map,
        album_row=cast(AlbumRow, SimpleNamespace(id=1)),
        provider_id=5,
    )
    assert result.is_ok(), result.info()
    lookup.assert_awaited_once_with(session=session, names=["Angèle"], provider_id=5, image_id=8)
    assert persist.call_args.kwargs["artist_map"] == {"Dua Lipa": lead, "Angèle": guest}
    assert artist_map == {"Dua Lipa": lead}


@pytest.mark.parametrize("count", [1, 50])
async def test_collaborator_lookup_is_batched(count: int) -> None:
    session = AsyncMock(spec=AsyncSession)
    returned = MagicMock()
    returned.scalars.return_value.all.return_value = []
    session.execute.return_value = returned
    names = [f"Guest {index}" for index in range(count)]
    result = await YoutubeMusicAccess.get_or_create_track_artists_async(
        session=session, names=names, provider_id=5, image_id=8
    )
    assert result.is_ok(), result.info()
    assert set(result.result()) == set(names)
    assert session.execute.await_count == 1
    assert session.add_all.call_count == 2


async def test_existing_track_receives_all_credits_in_one_idempotent_insert() -> None:
    session = AsyncMock(spec=AsyncSession)
    existing = cast(TrackRow, SimpleNamespace(id=50))
    found = MagicMock()
    found.scalar_one_or_none.return_value = existing
    session.execute.side_effect = [found, MagicMock()]
    lead = cast(ArtistRow, SimpleNamespace(id=1, name="Dua Lipa"))
    guest = cast(ArtistRow, SimpleNamespace(id=2, name="Angèle"))
    result = await YoutubeMusicAccess.get_or_create_track_with_image_id_async(
        session=session,
        raw=YoutubeMusicTrack(
            youtube_id="track",
            title="Fever",
            artists=["Dua Lipa", "Angèle", "Angèle"],
            album="Future Nostalgia",
        ),
        artist_map={"Dua Lipa": lead, "Angèle": guest},
        album_row=cast(AlbumRow, SimpleNamespace(id=3)),
        provider_id=5,
        image_id=8,
    )
    assert result.is_ok(), result.info()
    assert result.result() is existing
    assert session.execute.await_count == 2
    statement = session.execute.call_args.args[0]
    compiled = statement.compile()
    assert set(value for key, value in compiled.params.items() if key.startswith("artist_id")) == {
        1,
        2,
    }
    assert "ON CONFLICT DO NOTHING" in str(compiled)
