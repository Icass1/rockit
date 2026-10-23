from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.responses.artistPageResponse import ArtistCatalogResponse
from backend.spotifyScrapper.access.db.ormModels.artist import ArtistRow as Artist
from backend.spotifyScrapper.access.db.ormModels.track import TrackRow as Track
from backend.spotifyScrapper.access.db.ormModels.album import AlbumRow as Album

logger = getLogger(__name__)


class ArtistCatalogAccess:
    @staticmethod
    @safe_async
    async def get_async(
        session: AsyncSession, name: str, public_id: str | None = None
    ) -> AResult[ArtistCatalogResponse]:
        """Match only case/whitespace variants; reject collisions instead of guessing.

        Keep punctuation and accents significant. These are catalog candidates,
        not persistent identity merges or evidence of artist relationships.
        """
        key = "".join(name.lower().split())
        statement = select(Artist.id).where(
            func.regexp_replace(func.lower(Artist.name), r"\s+", "", "g") == key
        )
        if public_id:
            statement = (
                select(Artist.id)
                .join(CoreMediaRow, CoreMediaRow.id == Artist.id)
                .where(CoreMediaRow.public_id == public_id)
            )
        matches = list((await session.execute(statement.limit(2))).scalars())
        if len(matches) != 1:
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=ArtistCatalogResponse(ambiguous=len(matches) > 1),
            )
        artist_id = matches[0]
        songs = (
            select(CoreMediaRow.public_id)
            .join(Track, Track.id == CoreMediaRow.id)
            .where(Track.artists.any(Artist.id == artist_id))
            .order_by(CoreMediaRow.public_id)
        )
        albums = (
            select(CoreMediaRow.public_id)
            .join(Album, Album.id == CoreMediaRow.id)
            .where(Album.artists.any(Artist.id == artist_id))
            .order_by(CoreMediaRow.public_id)
        )
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=ArtistCatalogResponse(
                songIds=list((await session.execute(songs)).scalars()),
                albumIds=list((await session.execute(albums)).scalars()),
            ),
        )
