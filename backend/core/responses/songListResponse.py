from typing import List
from pydantic import BaseModel

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.searchResponse import BaseSearchResultsItem


class SongListResponse(BaseModel):
    songs: List[BaseSongWithAlbumResponse]
    # Songs similar to the seed that aren't in this Rockit instance yet —
    # tap providerUrl through /downloader/start-from-url to fetch them.
    # Empty when LASTFM_API_KEY isn't configured.
    discover: List[BaseSearchResultsItem] = []
