import type { ListeningHeatmapSegment } from "@/dto";

export interface ListeningHeatmapState {
    publicId?: string;
    segments: ListeningHeatmapSegment[];
    currentCount: number;
    status: "loading" | "ready" | "error";
}

export interface ListeningHeatmapSummary {
    segments: ListeningHeatmapSegment[];
    peak: number;
    coverage: number;
}
