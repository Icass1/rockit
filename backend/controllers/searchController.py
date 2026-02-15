from fastapi import Depends, APIRouter
from logging import Logger

from backend.db.ormModels.main.user import UserRow

from backend.init import downloader
from backend.spotifyApiTypes.rawSpotifyApiSearchResults import RawSpotifyApiSearchResults
from backend.utils.logger import getLogger
from backend.framework.user.user import User

from backend.responses.searchResponse import SearchResponse, SpotifyResults

logger: Logger = getLogger(__name__)
router = APIRouter(prefix="/search")


@router.get("/")
async def serach(query: str, user: UserRow = Depends(dependency=User.get_user_from_session)) -> SearchResponse:

    spotify_search: RawSpotifyApiSearchResults = downloader.spotify.search(
        q=query, limit=6)

    return SearchResponse(spotifyResults=SpotifyResults.from_spotify_search(spotify_search=spotify_search))
