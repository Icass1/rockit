from typing import Literal

from pydantic import BaseModel

from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.searchResponse import BaseSearchResultsItem


class SongListResponse(BaseModel):
    # Local recommendations: songs this Rockit instance already knows,
    # always computed offline.
    songs: list[BaseSongWithAlbumResponse]
    # Optional external suggestions (not necessarily in this instance yet).
    # Download one through /downloader/start-from-search. Empty unless the
    # server has a configured provider and it returned usable results.
    discover: list[BaseSearchResultsItem] = []
    # Which external provider produced `discover`, if any.
    discoverProvider: str | None = None
    # "disabled" (not configured / local-only request), "ok", "empty" (provider had
    # nothing usable) or "unavailable" (provider failed; local results only).
    discoverStatus: Literal["disabled", "ok", "empty", "unavailable"] = "disabled"
