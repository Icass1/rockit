import re
from typing import Any
from urllib.parse import quote

import httpx

from backend.constants import (
    LISTENBRAINZ_API_URL,
    RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS,
)
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.externalRecommendation.baseExternalRecommendationProvider import (
    BaseExternalRecommendationProvider,
)
from backend.core.framework.externalRecommendation.httpRequest import (
    as_json_list,
    as_json_object,
    send_rate_limited_request_async,
)
from backend.core.framework.externalRecommendation.rateLimiter import RateLimiter
from backend.core.framework.models.recommendation import (
    ERecommendationContextKind,
    ExternalRecommendationContext,
    ExternalSuggestion,
)

logger = getLogger(__name__)

# ListenBrainz asks every client application to stay at or below ONE request
# per second, and to send a User-Agent that identifies it.
# https://listenbrainz.readthedocs.io/en/latest/users/api/index.html
LISTENBRAINZ_MIN_REQUEST_INTERVAL_SECONDS = 1.0
LISTENBRAINZ_MAX_RATE_LIMIT_WAIT_SECONDS = 2.5
LISTENBRAINZ_USER_AGENT = "RockIt/0.0.1 ( https://github.com/Icass1/rockit )"
# Recording MBIDs requested per call. One call to the CF endpoint plus one
# batched metadata call per refresh — never one request per track.
LISTENBRAINZ_RECOMMENDATION_COUNT = 50
LISTENBRAINZ_MAX_USERNAME_LENGTH = 64

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)
# Control characters and path separators never belong in a username.
_INVALID_USERNAME_RE = re.compile(r"[\x00-\x1f\x7f/\\]")


class ListenBrainzProvider(BaseExternalRecommendationProvider):
    """Per-user collaborative-filtering recommendations from ListenBrainz.

    Flow (2 requests per refresh, both rate limited):
      1. GET  /1/cf/recommendation/user/{username}/recording
         -> recording MBIDs ranked by score. No auth needed; 204 means
            ListenBrainz has not generated recommendations for the user.
      2. POST /1/metadata/recording/ with all MBIDs at once
         -> recording name, artist credit and release for each MBID.

    Privacy: the only thing sent is the ListenBrainz username the user typed
    into their settings. Rockit's own listening history is never uploaded.
    Recommendations without a name or artist in the metadata response are
    dropped — they cannot be matched or downloaded.
    """

    key = "listenbrainz"
    display_name = "ListenBrainz"

    def __init__(
        self,
        base_url: str = LISTENBRAINZ_API_URL,
        timeout_seconds: float = RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS,
        limiter: RateLimiter | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds
        self._limiter = limiter or RateLimiter(
            min_interval_seconds=LISTENBRAINZ_MIN_REQUEST_INTERVAL_SECONDS,
            max_wait_seconds=LISTENBRAINZ_MAX_RATE_LIMIT_WAIT_SECONDS,
        )
        # Only set by tests, to mock HTTP.
        self._transport = transport

    @staticmethod
    def normalize_username(username: str | None) -> str | None:
        """Trimmed username, or None when empty."""

        if username is None:
            return None
        trimmed = username.strip()
        return trimmed or None

    @staticmethod
    def is_valid_username(username: str) -> bool:
        """Cheap local validation; whether the account exists is only known
        once ListenBrainz answers (404 means it does not)."""

        return (
            0 < len(username) <= LISTENBRAINZ_MAX_USERNAME_LENGTH
            and _INVALID_USERNAME_RE.search(username) is None
        )

    def is_configured(self) -> bool:
        return bool(self._base_url)

    def can_serve(self, context: ExternalRecommendationContext) -> bool:
        # Recommendations are per user, so they only make sense for the
        # personalized feed, not for "similar to this song".
        username = ListenBrainzProvider.normalize_username(
            context.listenbrainz_username
        )
        return (
            context.kind == ERecommendationContextKind.USER
            and username is not None
            and ListenBrainzProvider.is_valid_username(username)
        )

    def cache_key(self, context: ExternalRecommendationContext) -> str:
        username = (
            ListenBrainzProvider.normalize_username(context.listenbrainz_username) or ""
        )
        return f"{self.key}|user|{username.lower()}"

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            timeout=self._timeout,
            transport=self._transport,
            headers={"User-Agent": LISTENBRAINZ_USER_AGENT},
        )

    async def get_suggestions_async(
        self, context: ExternalRecommendationContext, limit: int
    ) -> AResult[list[ExternalSuggestion]]:
        """Fetch and resolve the user's recommended recordings."""

        username = ListenBrainzProvider.normalize_username(
            context.listenbrainz_username
        )
        if username is None or not ListenBrainzProvider.is_valid_username(username):
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid ListenBrainz username"
            )

        try:
            async with self._client() as client:
                a_mbids = await self._get_recommended_mbids_async(
                    client=client,
                    username=username,
                    count=max(limit, LISTENBRAINZ_RECOMMENDATION_COUNT),
                )
                if a_mbids.is_not_ok():
                    return AResult(code=a_mbids.code(), message=a_mbids.message())

                ranked_mbids = a_mbids.result()
                if not ranked_mbids:
                    return AResult(code=AResultCode.OK, message="OK", result=[])

                a_metadata = await self._get_metadata_async(
                    client=client, mbids=[mbid for mbid, _ in ranked_mbids]
                )
                if a_metadata.is_not_ok():
                    return AResult(code=a_metadata.code(), message=a_metadata.message())
        except Exception as e:
            # Defensive: the contract is "never raise".
            logger.error(f"Unexpected ListenBrainz error: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Unexpected ListenBrainz error"
            )

        metadata = a_metadata.result()
        suggestions: list[ExternalSuggestion] = []
        for mbid, score in ranked_mbids:
            suggestion = ListenBrainzProvider._parse_recording(
                mbid=mbid, score=score, data=metadata.get(mbid)
            )
            if suggestion is not None:
                suggestions.append(suggestion)

        return AResult(code=AResultCode.OK, message="OK", result=suggestions)

    async def _get_recommended_mbids_async(
        self, client: httpx.AsyncClient, username: str, count: int
    ) -> AResult[list[tuple[str, float]]]:
        """(recording_mbid, score) pairs in ListenBrainz's ranking order."""

        a_response = await send_rate_limited_request_async(
            client=client,
            limiter=self._limiter,
            provider_name=self.display_name,
            method="GET",
            url=f"{self._base_url}/1/cf/recommendation/user/"
            f"{quote(username, safe='')}/recording",
            params={"count": count},
        )
        if a_response.is_not_ok():
            return AResult(code=a_response.code(), message=a_response.message())

        response = a_response.result()
        if response.status_code == 204:
            # Not generated yet (e.g. too little listening history there).
            return AResult(code=AResultCode.OK, message="OK", result=[])
        if response.status_code == 404:
            return AResult(
                code=AResultCode.NOT_FOUND, message="ListenBrainz user not found"
            )
        if response.status_code != 200:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"ListenBrainz returned HTTP {response.status_code}",
            )

        try:
            body = as_json_object(response.json())
        except ValueError:
            body = None
        payload = as_json_object(body.get("payload")) if body else None
        raw_mbids = as_json_list(payload.get("mbids")) if payload else None
        if raw_mbids is None:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="ListenBrainz returned an invalid recommendation payload",
            )

        result: list[tuple[str, float]] = []
        seen: set[str] = set()
        for value in raw_mbids:
            entry = as_json_object(value)
            if entry is None:
                continue
            mbid: Any = entry.get("recording_mbid")
            if not isinstance(mbid, str) or not _UUID_RE.match(mbid):
                continue
            mbid = mbid.lower()
            if mbid in seen:
                continue
            seen.add(mbid)
            raw_score: Any = entry.get("score", 0.0)
            score = float(raw_score) if isinstance(raw_score, (int, float)) else 0.0
            result.append((mbid, score))

        return AResult(code=AResultCode.OK, message="OK", result=result)

    async def _get_metadata_async(
        self, client: httpx.AsyncClient, mbids: list[str]
    ) -> AResult[dict[str, Any]]:
        """Batch-resolve recording MBIDs to names in a single request."""

        a_response = await send_rate_limited_request_async(
            client=client,
            limiter=self._limiter,
            provider_name=self.display_name,
            method="POST",
            url=f"{self._base_url}/1/metadata/recording/",
            json={"recording_mbids": mbids, "inc": "artist release"},
        )
        if a_response.is_not_ok():
            return AResult(code=a_response.code(), message=a_response.message())

        response = a_response.result()
        if response.status_code != 200:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"ListenBrainz metadata returned HTTP {response.status_code}",
            )

        try:
            body = as_json_object(response.json())
        except ValueError:
            body = None
        if body is None:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="ListenBrainz returned an invalid metadata payload",
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={str(k).lower(): v for k, v in body.items()},
        )

    @staticmethod
    def _parse_recording(
        mbid: str, score: float, data: Any
    ) -> ExternalSuggestion | None:
        """One metadata entry -> suggestion, or None when the recording has
        no usable title or artist."""

        entry = as_json_object(data)
        if entry is None:
            return None

        recording = as_json_object(entry.get("recording"))
        artist = as_json_object(entry.get("artist"))
        release = as_json_object(entry.get("release"))

        track_name: Any = recording.get("name") if recording else None
        artist_name: Any = artist.get("name") if artist else None
        album_name: Any = release.get("name") if release else None

        if not isinstance(track_name, str) or not track_name.strip():
            return None
        if not isinstance(artist_name, str) or not artist_name.strip():
            return None

        return ExternalSuggestion(
            artist_name=artist_name.strip(),
            track_name=track_name.strip(),
            score=score,
            recording_mbid=mbid,
            album_name=album_name.strip() if isinstance(album_name, str) else None,
        )
