from typing import List

from pydantic import BaseModel

from backend.core.responses.statsHeatmapCellResponse import StatsHeatmapCellResponse
from backend.core.responses.statsMinutesEntryResponse import StatsMinutesEntryResponse
from backend.core.responses.statsRankedItemResponse import StatsRankedItemResponse
from backend.core.responses.statsSummaryResponse import StatsSummaryResponse


class UserStatsResponse(BaseModel):
    summary: StatsSummaryResponse
    minutes: List[StatsMinutesEntryResponse]
    topSongs: List[StatsRankedItemResponse]
    topAlbums: List[StatsRankedItemResponse]
    topArtists: List[StatsRankedItemResponse]
    heatmap: List[StatsHeatmapCellResponse]
