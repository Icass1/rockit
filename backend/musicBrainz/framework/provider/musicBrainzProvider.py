import re
import unicodedata
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.framework.provider.baseMetadataProvider import BaseMetadataProvider
from backend.core.responses.metadataResponse import MetadataResponse
from backend.musicBrainz.framework.musicBrainzApi import MusicBrainzApi

logger = getLogger(__name__)


class MusicBrainzProvider(BaseMetadataProvider):
    async def search_artists_async(
        self,
        session: AsyncSession,
        name: str,
        offset: int = 0,
        limit: int = 25,
        refresh: bool = False,
    ) -> AResult[MetadataResponse]:
        """Return candidates and aliases, never silently merge similar names.

        Escape Lucene syntax so user names remain literal search terms. Preserve
        accents, punctuation and internal spacing in the source's display names.
        """
        normalized = " ".join(unicodedata.normalize("NFC", name).split()).casefold()
        if (
            not normalized
            or len(normalized) > 200
            or offset < 0
            or not 1 <= limit <= 100
        ):
            logger.warning("Invalid MusicBrainz artist search")
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid artist search"
            )
        escaped = re.sub(r'([+\-!(){}\[\]^"~*?:\\/&|])', r"\\\1", normalized)
        return await MusicBrainzApi.fetch_async(
            path="artist",
            params={
                "query": f'artist:"{escaped}" OR alias:"{escaped}"',
                "offset": offset,
                "limit": limit,
            },
            entity="artist-search",
            refresh=refresh,
        )

    async def get_metadata_async(
        self,
        session: AsyncSession,
        entity: str,
        external_id: str,
        offset: int = 0,
        limit: int = 100,
        refresh: bool = False,
    ) -> AResult[MetadataResponse]:
        """Fetch one entity/page only; full provider JSON is preserved in PostgreSQL."""
        try:
            mbid = str(UUID(external_id))
        except ValueError:
            logger.warning("Invalid MusicBrainz external identifier")
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid external identifier"
            )
        if offset < 0 or not 1 <= limit <= 100:
            logger.warning("Invalid MusicBrainz pagination")
            return AResult(code=AResultCode.BAD_REQUEST, message="Invalid pagination")
        details = {
            "artist": "aliases+artist-rels+url-rels+genres+tags",
            "release-group": "artists+aliases+artist-rels+url-rels+genres+tags",
            "release": "recordings+artist-credits+release-groups+labels+artist-rels+url-rels",
            "recording": "artists+releases+isrcs+artist-rels+url-rels+genres+tags",
            "event": "artists+places+url-rels",
        }
        browses = {
            "discography": ("release-group", "artist", "artist-credits"),
            "recordings": ("recording", "artist", "artist-credits+isrcs"),
            "releases": ("release", "release-group", "artist-credits+labels"),
        }
        if entity in details:
            path = f"{entity}/{mbid}"
            params: dict[str, str | int] = {"inc": details[entity]}
        elif entity in browses:
            path, parent, includes = browses[entity]
            params = {parent: mbid, "inc": includes, "offset": offset, "limit": limit}
        else:
            logger.warning("Unsupported metadata entity: %s", entity)
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Unsupported metadata entity"
            )
        return await MusicBrainzApi.fetch_async(
            path=path, params=params, entity=entity, external_id=mbid, refresh=refresh
        )


provider = MusicBrainzProvider()
name = "MusicBrainz"
