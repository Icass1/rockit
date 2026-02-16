from fastapi import Depends, APIRouter
from logging import Logger


from backend.init import downloader
from backend.middleware.authMiddleware import AuthMiddleware
from backend.spotifyApiTypes.rawSpotifyApiSearchResults import RawSpotifyApiSearchResults
from backend.utils.logger import getLogger

from backend.responses.searchResponse import SearchResponse, SpotifyResults

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/search", dependencies=[Depends(AuthMiddleware.auth_dependency)])


@router.get("/")
async def serach(query: str) -> SearchResponse:

    spotify_search: RawSpotifyApiSearchResults = downloader.spotify.search(
        q=query, limit=6)

    return SearchResponse(spotifyResults=SpotifyResults.from_spotify_search(spotify_search=spotify_search))
