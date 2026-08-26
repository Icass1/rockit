import os
from typing import Any, List, TypedDict

import httpx

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger

logger = getLogger(__name__)

LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/"
LASTFM_REQUEST_TIMEOUT_SECONDS = 8.0


class SimilarTrack(TypedDict):
    artist_name: str
    track_name: str
    match: float


def _get_api_key() -> str | None:
    """Read the Last.fm API key directly from the environment.

    Deliberately not wired through backend.constants — that module treats a
    missing var as a fatal boot error, and this integration is optional: no
    key just means discovery suggestions are skipped, not a broken app.
    """

    key = os.getenv("LASTFM_API_KEY")
    return key if key else None


class LastfmClient:
    @staticmethod
    def is_configured() -> bool:
        return _get_api_key() is not None

    @staticmethod
    async def get_similar_tracks_async(
        artist_name: str,
        track_name: str,
        limit: int = 10,
    ) -> AResult[List[SimilarTrack]]:
        """Songs similar to (artist_name, track_name) per Last.fm's public,
        free, no-account-required track.getsimilar endpoint."""

        api_key = _get_api_key()
        if api_key is None:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        try:
            async with httpx.AsyncClient(
                timeout=LASTFM_REQUEST_TIMEOUT_SECONDS
            ) as client:
                response = await client.get(
                    LASTFM_API_URL,
                    params={
                        "method": "track.getsimilar",
                        "artist": artist_name,
                        "track": track_name,
                        "api_key": api_key,
                        "format": "json",
                        "limit": limit,
                        "autocorrect": 1,
                    },
                )
                response.raise_for_status()
                data: dict[str, Any] = response.json()

            if "error" in data:
                # Last.fm returns HTTP 200 with an {"error": ...} body for
                # things like "track not found" — not a real failure.
                logger.debug(
                    f"Last.fm returned no similar tracks for "
                    f"'{artist_name} - {track_name}': {data.get('message')}"
                )
                return AResult(code=AResultCode.OK, message="OK", result=[])

            raw_tracks: List[dict[str, Any]] = data.get("similartracks", {}).get(
                "track", []
            )

            tracks: List[SimilarTrack] = [
                {
                    "artist_name": t.get("artist", {}).get("name", ""),
                    "track_name": t.get("name", ""),
                    "match": float(t.get("match", 0.0)),
                }
                for t in raw_tracks
                if t.get("name") and t.get("artist", {}).get("name")
            ]

            return AResult(code=AResultCode.OK, message="OK", result=tracks)

        except httpx.HTTPError as e:
            logger.warning(
                f"Last.fm request failed for '{artist_name} - {track_name}': {e}"
            )
            return AResult(code=AResultCode.OK, message="OK", result=[])
        except Exception as e:
            logger.error(f"Unexpected error calling Last.fm: {e}", exc_info=True)
            return AResult(code=AResultCode.OK, message="OK", result=[])
