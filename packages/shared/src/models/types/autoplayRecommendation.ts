import type { BaseSearchResultsItem, BaseSongWithAlbumResponse } from "@/dto";

export type AutoplayRecommendation =
    | { kind: "song"; song: BaseSongWithAlbumResponse }
    | { kind: "discover"; item: BaseSearchResultsItem };
