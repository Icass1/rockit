import re
import unicodedata
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.framework.provider.baseMetadataProvider import BaseMetadataProvider
from backend.core.responses.metadataResponse import MetadataResponse
from backend.core.responses.artistMetadataResponse import (
    ArtistMetadataCandidates,
    ArtistMetadataProfile,
    ArtistMetadataCatalog,
    ArtistMetadataIdentity,
    ArtistMetadataItem,
)
from backend.musicBrainz.framework.musicBrainzApi import MusicBrainzApi
from backend.musicBrainz.framework.models.metadata import (
    SourceArtist,
    SourceArtistSearch,
    SourceCatalog,
)

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
        result = await MusicBrainzApi.fetch_async(
            path="artist",
            params={
                "query": f'artist:"{escaped}" OR alias:"{escaped}"',
                "offset": offset,
                "limit": limit,
            },
            entity="artist-search",
            refresh=refresh,
        )

        if result.is_not_ok():
            return result
        response = result.result()

        try:
            artists = SourceArtistSearch.model_validate(response.data).artists
        except ValidationError:
            logger.exception("Invalid MusicBrainz artist search response")
            return AResult(
                code=AResultCode.SERVICE_UNAVAILABLE,
                message="Invalid metadata response",
            )
        candidates = ArtistMetadataCandidates(
            candidates=[
                ArtistMetadataIdentity(
                    id=artist.id,
                    name=artist.name,
                    note=" · ".join(
                        value
                        for value in [
                            artist.disambiguation,
                            artist.country,
                            artist.type,
                        ]
                        if value
                    ),
                )
                for artist in sorted(
                    artists, key=lambda artist: artist.score, reverse=True
                )
            ]
        )
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=response.model_copy(
                update={
                    "data": {
                        **response.data,
                        **candidates.model_dump(),
                    }
                }
            ),
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
        presentation = entity
        entity = {
            "artist-profile": "artist",
            "artist-discography": "discography",
            "artist-recordings": "recordings",
        }.get(entity, entity)
        details = {
            "artist": "aliases+artist-rels+event-rels+url-rels+genres+tags",
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
            if entity == "discography":
                # Use MusicBrainz's own catalogue view: exclude groups containing
                # only bootlegs, promotions or pseudo-releases. Official live
                # albums remain Album + Live, independent of cover availability.
                params["release-group-status"] = "website-default"
        else:
            logger.warning("Unsupported metadata entity: %s", entity)
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Unsupported metadata entity"
            )
        result = await MusicBrainzApi.fetch_async(
            path=path, params=params, entity=entity, external_id=mbid, refresh=refresh
        )
        if result.is_not_ok() or presentation == entity:
            return result
        response = result.result()
        try:
            projected = self._project_artist_metadata(response, presentation, offset)
        except ValidationError:
            logger.exception("Invalid MusicBrainz %s response", presentation)
            return AResult(
                code=AResultCode.SERVICE_UNAVAILABLE,
                message="Invalid metadata response",
            )
        return AResult(code=AResultCode.OK, message="OK", result=projected)

    @staticmethod
    def _project_artist_metadata(
        response: MetadataResponse, presentation: str, offset: int
    ) -> MetadataResponse:
        output: ArtistMetadataProfile | ArtistMetadataCatalog
        if presentation == "artist-profile":
            artist = SourceArtist.model_validate(response.data)
            output = ArtistMetadataProfile(
                name=artist.name,
                description=" · ".join(
                    value
                    for value in [
                        artist.disambiguation,
                        artist.area.name if artist.area else None,
                        artist.lifespan.begin if artist.lifespan else None,
                    ]
                    if value
                ),
                genres=[genre.name for genre in artist.genres],
                related=[
                    ArtistMetadataIdentity(
                        id=relation.artist.id,
                        name=relation.artist.name,
                        note=relation.type,
                    )
                    for relation in artist.relations
                    if relation.artist is not None
                ],
                events=[
                    ArtistMetadataItem(
                        id=relation.event.id,
                        title=relation.event.name,
                        date=(
                            relation.event.lifespan.begin
                            if relation.event.lifespan
                            else None
                        )
                        or relation.begin
                        or "",
                    )
                    for relation in artist.relations
                    if relation.event is not None
                ],
            )
        else:
            catalog = SourceCatalog.model_validate(response.data)
            discography = presentation == "artist-discography"
            items = catalog.release_groups if discography else catalog.recordings
            total = (
                catalog.release_group_count if discography else catalog.recording_count
            )
            source_offset = (
                catalog.release_group_offset
                if discography
                else catalog.recording_offset
            )
            output = ArtistMetadataCatalog(
                items=[
                    ArtistMetadataItem(
                        id=item.id,
                        title=item.title,
                        date=item.date or "",
                        kind=item.primary_type or "",
                        secondaryTypes=item.secondary_types or [],
                        imageUrl=(
                            f"https://coverartarchive.org/release-group/{item.id}/front-250"
                            if discography
                            else ""
                        ),
                    )
                    for item in items
                ],
                total=total if total is not None else len(items),
                offset=source_offset if source_offset is not None else offset,
            )
        return response.model_copy(
            update={"entity": presentation, "data": output.model_dump()}
        )


provider = MusicBrainzProvider()
name = "MusicBrainz"
