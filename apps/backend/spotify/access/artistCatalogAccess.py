from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.media import CoreMediaRow
from core.aResult import AResult, AResultCode
from core.responses.artistPageResponse import ArtistCatalogResponse
from core.utils.safeAsyncCall import safe_async
from logger import getLogger
from spotify.access.db.ormModels.album import AlbumRow as Album
from spotify.access.db.ormModels.artist import ArtistRow as Artist
from spotify.access.db.ormModels.track import TrackRow as Track

logger = getLogger(__name__)


class ArtistCatalogAccess:
    @staticmethod
    @safe_async
    async def get_async(
        session: AsyncSession, name: str, public_id: str | None = None
    ) -> AResult[ArtistCatalogResponse]:
        """Match case/whitespace variants; use source IDs to resolve name collisions.

        Keep punctuation and accents significant. These are catalog candidates,
        not persistent identity merges or evidence of artist relationships.
        """
        key = "".join(name.lower().split())
        statement = select(Artist.id, Artist.name).where(
            func.regexp_replace(func.lower(Artist.name), r"\s+", "", "g") == key
        )
        if public_id:
            statement = (
                select(Artist.id, Artist.name)
                .join(CoreMediaRow, CoreMediaRow.id == Artist.id)
                .where(CoreMediaRow.public_id == public_id)
            )
        matches = list((await session.execute(statement)).all())
        # Case/spacing variants form a read-only catalog view. Identically named
        # records with different source identities still need an explicit ID.
        ambiguous = len({row.name for row in matches}) < len(matches)
        if not matches or (ambiguous and not public_id):
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=ArtistCatalogResponse(ambiguous=ambiguous),
            )
        artist_ids = [row.id for row in matches]
        songs = (
            select(CoreMediaRow.public_id)
            .join(Track, Track.id == CoreMediaRow.id)
            .where(Track.artists.any(Artist.id.in_(artist_ids)))
            .order_by(CoreMediaRow.public_id)
        )
        albums = (
            select(CoreMediaRow.public_id)
            .join(Album, Album.id == CoreMediaRow.id)
            .where(
                or_(
                    Album.artists.any(Artist.id.in_(artist_ids)),
                    Album.songs.any(Track.artists.any(Artist.id.in_(artist_ids))),
                )
            )
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
