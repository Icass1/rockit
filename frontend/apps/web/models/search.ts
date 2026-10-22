import type { BaseSearchResultsItem } from "@rockit/shared";

export type SearchMediaType = BaseSearchResultsItem["type"];

export type SearchProviderState = {
    id: string;
    name: string;
    onDemand: boolean;
    results: BaseSearchResultsItem[];
    hasMoreTypes: string[];
    limits: Partial<Record<SearchMediaType, number>>;
    loadingTypes: SearchMediaType[];
    failed: boolean;
};
