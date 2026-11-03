import type { ListeningHeatmapSegment } from "@/dto";

export interface ListeningHeatmapState {
    publicId?: string;
    segments: ListeningHeatmapSegment[];
    status: "loading" | "ready" | "error";
}

export interface ListeningHeatmapSummary {
    segments: ListeningHeatmapSegment[];
    peak: number;
    coverage: number;
}
