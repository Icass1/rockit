from sqlalchemy.ext.asyncio import AsyncSession
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.framework import providers
from backend.core.framework.media.media import Media
from backend.core.framework.media.collection import Collection
from backend.core.access.collectionAccess import CollectionAccess
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.artistPageResponse import ArtistPageResponse

logger = getLogger(__name__)


class Artist:
    @staticmethod
    async def page_async(
        session: AsyncSession,
        user_id: int,
        public_id: str | None = None,
        name: str = "",
        offset: int = 0,
        limit: int = 100,
    ) -> AResult[ArtistPageResponse]:
        """Compose bounded local catalogs through provider contracts only.

        Name matching supplies a view, never changes provider IDs. Relationships
        require explicit external identity evidence and are deliberately not guessed.
        """
        anchor = None
        if public_id:
            result = await Media.get_artist_async(session=session, public_id=public_id)
            if result.is_not_ok():
                logger.error(f"Artist lookup failed: {result.info()}")
                return AResult(code=result.code(), message=result.message())
            anchor = result.result()
            name = anchor.name
        if not name.strip():
            logger.warning("Artist name is empty")
            return AResult(code=AResultCode.BAD_REQUEST, message="Artist name required")
        page = ArtistPageResponse(
            artist=anchor
            or BaseArtistResponse(
                provider="",
                publicId="",
                url="",
                providerUrl="",
                name=name,
                imageUrl="",
                dominantColor="",
            ),
            offset=offset,
        )
        song_position = album_position = 0
        album_page_ids: list[str] = []
        for provider in providers.get_media_providers():
            result = await provider.get_artist_catalog_async(
                session=session,
                name=name,
                public_id=(
                    public_id
                    if anchor and anchor.provider == provider.get_name()
                    else None
                ),
            )
            if result.is_not_ok():
                logger.error(f"Artist catalog failed: {result.info()}")
                page.partial = True
                continue
            catalog = result.result()
            page.partial |= catalog.ambiguous
            song_ids = catalog.songIds[
                max(0, offset - song_position) : max(0, offset + limit - song_position)
            ]
            album_ids = catalog.albumIds[
                max(0, offset - album_position) : max(
                    0, offset + limit - album_position
                )
            ]
            song_position += len(catalog.songIds)
            album_position += len(catalog.albumIds)
            if song_ids:
                songs = await provider.get_songs_async(
                    session=session, public_ids=song_ids
                )
                if songs.is_not_ok():
                    logger.error(f"Artist songs failed: {songs.info()}")
                    page.partial = True
                else:
                    page.songs.extend(songs.result())
            album_page_ids.extend(album_ids)
        if album_page_ids:
            albums = await CollectionAccess.records_async(
                session=session, public_ids=album_page_ids, user_id=user_id
            )
            if albums.is_not_ok():
                logger.error(f"Artist album summaries failed: {albums.info()}")
                page.partial = True
            else:
                page.albums = [
                    BaseAlbumWithoutSongsResponse.model_validate(
                        Collection.summary(record=record).model_dump()
                    )
                    for record in albums.result()
                ]
        # Name-based discovery can have metadata without locally indexed music.
        # Provider-backed IDs still require the successful anchor lookup above.
        page.totalSongs = song_position
        page.totalAlbums = album_position
        page.hasMore = max(song_position, album_position) > offset + limit
        return AResult(code=AResultCode.OK, message="OK", result=page)
