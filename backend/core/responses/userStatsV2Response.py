from typing import List

from pydantic import BaseModel

from backend.core.responses.statsV2SummaryResponse import StatsV2SummaryResponse
from backend.core.responses.statsHeatmapCellResponse import StatsHeatmapCellResponse
from backend.core.responses.statsMinutesEntryResponse import StatsMinutesEntryResponse
from backend.core.responses.statsRankedItemResponse import StatsRankedItemResponse


class UserStatsV2Response(BaseModel):
    summary: StatsV2SummaryResponse
    minutes: List[StatsMinutesEntryResponse]
    topSongs: List[StatsRankedItemResponse]
    topVideos: List[StatsRankedItemResponse]
    topAlbums: List[StatsRankedItemResponse]
    topArtists: List[StatsRankedItemResponse]
    heatmap: List[StatsHeatmapCellResponse]
