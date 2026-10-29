from pydantic import BaseModel

from core.responses.statsHeatmapCellResponse import StatsHeatmapCellResponse
from core.responses.statsMinutesEntryResponse import StatsMinutesEntryResponse
from core.responses.statsRankedItemResponse import StatsRankedItemResponse
from core.responses.statsSummaryResponse import StatsSummaryResponse


class UserStatsResponse(BaseModel):
    summary: StatsSummaryResponse
    minutes: list[StatsMinutesEntryResponse]
    topSongs: list[StatsRankedItemResponse]
    topVideos: list[StatsRankedItemResponse]
    topAlbums: list[StatsRankedItemResponse]
    topArtists: list[StatsRankedItemResponse]
    heatmap: list[StatsHeatmapCellResponse]
