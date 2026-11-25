from typing import cast

from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.providerMetadataReviewAccess import ProviderMetadataReviewAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.models.metadataReviewTables import MetadataReviewTables
from result import Result
from youtubeMusic.access.db.associationTables.track_album_artists import (
    album_artists,
    track_artists,
)
from youtubeMusic.access.db.ormModels.album import AlbumRow
from youtubeMusic.access.db.ormModels.artist import ArtistRow
from youtubeMusic.access.db.ormModels.track import TrackRow


class MetadataReviewAccess:
    @staticmethod
    async def apply_async(
        session: AsyncSession, public_id: str, changes: dict[str, str]
    ) -> Result[bool]:
        return await ProviderMetadataReviewAccess.apply_async(
            session=session,
            public_id=public_id,
            changes=changes,
            tables=MetadataReviewTables(
                media={
                    MediaTypeEnum.SONG.value: cast(Table, TrackRow.__table__),
                    MediaTypeEnum.ALBUM.value: cast(Table, AlbumRow.__table__),
                    MediaTypeEnum.ARTIST.value: cast(Table, ArtistRow.__table__),
                },
                title_columns={
                    MediaTypeEnum.SONG.value: "title",
                    MediaTypeEnum.ALBUM.value: "title",
                    MediaTypeEnum.ARTIST.value: "name",
                },
                artist=cast(Table, ArtistRow.__table__),
                album=cast(Table, AlbumRow.__table__),
                album_title="title",
                artist_links={
                    MediaTypeEnum.SONG.value: (track_artists, "track_id"),
                    MediaTypeEnum.ALBUM.value: (album_artists, "album_id"),
                },
            ),
        )
