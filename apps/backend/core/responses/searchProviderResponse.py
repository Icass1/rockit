from pydantic import BaseModel, Field

from core.responses.searchResponse import BaseSearchResultsItem


class SearchProviderInfo(BaseModel):
    id: str
    name: str
    onDemand: bool = False


class SearchProvidersResponse(BaseModel):
    providers: list[SearchProviderInfo]


class SearchProviderResponse(BaseModel):
    results: list[BaseSearchResultsItem]
    hasMoreTypes: list[str] = Field(default_factory=list)
