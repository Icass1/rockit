from pydantic import BaseModel, StrictBool


class UpdateListeningHeatmapRequest(BaseModel):
    enabled: StrictBool
