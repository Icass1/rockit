import type { ListeningHeatmapSegment } from "@/dto";
import type { ListeningHeatmapSummary } from "@/models/types/listeningHeatmap";
import { Http } from "@/lib/http";

export class ListeningHeatmapManager {
    async load(publicId: string): Promise<ListeningHeatmapSegment[]> {
        const response = await Http.getListeningHeatmap(publicId);
        if (response.isNotOk() || !response.result)
            throw new Error("Listening history unavailable");
        return response.result.segments;
    }

    summarize(
        segments: ListeningHeatmapSegment[],
        duration: number
    ): ListeningHeatmapSummary {
        const end = Math.max(0, duration * 1000);
        const visible = segments.flatMap((segment) => {
            const startMs = Math.max(0, segment.startMs);
            const endMs = Math.min(end, segment.endMs);
            return endMs > startMs && segment.count > 0
                ? [{ ...segment, startMs, endMs }]
                : [];
        });
        const peak = visible.reduce(
            (maximum, segment) => Math.max(maximum, segment.count),
            0
        );
        const covered = visible.reduce(
            (sum, segment) => sum + segment.endMs - segment.startMs,
            0
        );
        return {
            segments: visible,
            peak,
            coverage: end > 0 ? Math.round((covered / end) * 100) : 0,
        };
    }
}

export const listeningHeatmapManager = new ListeningHeatmapManager();
