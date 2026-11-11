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

    withPlayback(
        segments: ListeningHeatmapSegment[],
        currentTime: number
    ): ListeningHeatmapSegment[] {
        const cursor = Math.max(0, Math.round(currentTime * 1000));
        if (!Number.isFinite(cursor) || cursor === 0) return segments;
        const boundaries = Array.from(
            new Set([
                0,
                cursor,
                ...segments.flatMap(({ startMs, endMs }) => [startMs, endMs]),
            ])
        ).sort((a, b) => a - b);
        const result: ListeningHeatmapSegment[] = [];
        let index = 0;
        for (let i = 0; i < boundaries.length - 1; i++) {
            const startMs = boundaries[i];
            const endMs = boundaries[i + 1];
            while (index < segments.length && segments[index].endMs <= startMs)
                index++;
            const segment = segments[index];
            const count =
                (segment && segment.startMs <= startMs ? segment.count : 0) +
                (startMs < cursor ? 1 : 0);
            if (count === 0) continue;
            const previous = result.at(-1);
            if (previous?.endMs === startMs && previous.count === count)
                previous.endMs = endMs;
            else result.push({ startMs, endMs, count });
        }
        return result;
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
