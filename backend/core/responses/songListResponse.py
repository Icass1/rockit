from typing import List, Literal
from pydantic import BaseModel

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.searchResponse import BaseSearchResultsItem


class SongListResponse(BaseModel):
    # Local recommendations: songs this Rockit instance already knows,
    # always computed offline.
    songs: List[BaseSongWithAlbumResponse]
    # Optional external suggestions (not necessarily in this instance yet).
    # Download one through /downloader/start-from-search. Empty unless the
    # server has a configured provider and it returned usable results.
    discover: List[BaseSearchResultsItem] = []
    # Which external provider produced `discover`, if any.
    discoverProvider: str | None = None
    # "disabled" (not configured / local-only request), "ok", "empty" (provider had
    # nothing usable) or "unavailable" (provider failed; local results only).
    discoverStatus: Literal["disabled", "ok", "empty", "unavailable"] = "disabled"
