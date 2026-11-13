import type { StatsRankedItemResponse } from "@/dto";
import type { Vocabulary } from "@/models/types/vocabulary";

export interface AnnualRecapSlide {
    id: string;
    kind:
        | "intro"
        | "total"
        | "song"
        | "artists"
        | "songs"
        | "insight"
        | "month"
        | "summary";
    titleKey: keyof Vocabulary;
    bodyKey: keyof Vocabulary;
    values?: Record<string, string | number>;
    value?: number;
    item?: StatsRankedItemResponse;
    items?: StatsRankedItemResponse[];
    rank?: number;
    month?: number;
}
export interface AnnualRecap {
    year: number;
    start: string;
    end: string;
    inProgress: boolean;
    empty: boolean;
    slides: AnnualRecapSlide[];
}
