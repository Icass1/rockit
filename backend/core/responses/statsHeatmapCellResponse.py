from pydantic import BaseModel


class StatsHeatmapCellResponse(BaseModel):
    hour: int
    day: int
    value: int
