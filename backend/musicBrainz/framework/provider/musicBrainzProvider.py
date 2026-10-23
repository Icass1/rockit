import re
import unicodedata
from uuid import UUID
from typing import Any, cast
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.framework.provider.baseMetadataProvider import BaseMetadataProvider
from backend.core.responses.metadataResponse import MetadataResponse
from backend.core.responses.artistMetadataResponse import (
    ArtistMetadataCandidates,
    ArtistMetadataProfile,
    ArtistMetadataCatalog,
)
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
        candidates = [
            {
                "id": artist["id"],
                "name": artist["name"],
                "note": " · ".join(
                    filter(
                        None,
                        [
                            artist.get("disambiguation"),
                            artist.get("country"),
                            artist.get("type"),
                        ],
                    )
                ),
            }
            for artist in response.data.get("artists", [])
        ]
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=response.model_copy(
                update={
                    "data": {
                        **response.data,
                        **ArtistMetadataCandidates.model_validate(
                            {"candidates": candidates}
                        ).model_dump(),
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
        data = response.data
        output: dict[str, Any]
        if presentation == "artist-profile":
            area: dict[str, Any] = data.get("area") or {}
            lifespan: dict[str, Any] = data.get("life-span") or {}
            output = {
                "name": data.get("name", ""),
                "description": " · ".join(
                    filter(
                        None,
                        [
                            data.get("disambiguation"),
                            area.get("name"),
                            lifespan.get("begin"),
                        ],
                    )
                ),
                "genres": [genre["name"] for genre in data.get("genres", [])],
                "related": [
                    {
                        "id": relation["artist"]["id"],
                        "name": relation["artist"]["name"],
                        "note": relation.get("type", ""),
                    }
                    for relation in data.get("relations", [])
                    if "artist" in relation
                ],
                "events": [
                    {
                        "id": relation["event"]["id"],
                        "title": relation["event"]["name"],
                        "date": cast(
                            dict[str, Any], relation["event"].get("life-span") or {}
                        ).get("begin", "")
                        or relation.get("begin", "")
                        or "",
                    }
                    for relation in data.get("relations", [])
                    if "event" in relation
                ],
            }
        else:
            key = "release-group" if entity == "discography" else "recording"
            items = data.get(f"{key}s", [])
            output = {
                "items": [
                    {
                        "id": item["id"],
                        "title": item["title"],
                        "date": item.get("first-release-date") or "",
                        "kind": item.get("primary-type") or "",
                    }
                    for item in items
                ],
                "total": data.get(f"{key}-count", len(items)),
                "offset": data.get(f"{key}-offset", offset),
            }
        schema = (
            ArtistMetadataProfile
            if presentation == "artist-profile"
            else ArtistMetadataCatalog
        )
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=response.model_copy(
                update={
                    "entity": presentation,
                    "data": schema.model_validate(output).model_dump(),
                }
            ),
        )


provider = MusicBrainzProvider()
name = "MusicBrainz"
