from pydantic import BaseModel

from core.responses.statsHeatmapCellResponse import StatsHeatmapCellResponse
from core.responses.statsInsightsResponse import StatsInsightsResponse
from core.responses.statsMinutesEntryResponse import StatsMinutesEntryResponse
from core.responses.statsRankedItemResponse import StatsRankedItemResponse
from core.responses.statsV2SummaryResponse import StatsV2SummaryResponse


class UserStatsV2Response(BaseModel):
    summary: StatsV2SummaryResponse
    minutes: list[StatsMinutesEntryResponse]
    topSongs: list[StatsRankedItemResponse]
    topVideos: list[StatsRankedItemResponse]
    topAlbums: list[StatsRankedItemResponse]
    topArtists: list[StatsRankedItemResponse]
    heatmap: list[StatsHeatmapCellResponse]
    insights: StatsInsightsResponse
