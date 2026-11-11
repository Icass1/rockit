import type { ListeningHeatmapSegment } from "@/dto";
import type {
    ListeningHeatmapInterval,
    ListeningHeatmapSummary,
} from "@/models/types/listeningHeatmap";
import { Http } from "@/lib/http";

export class ListeningHeatmapManager {
    async load(publicId: string): Promise<ListeningHeatmapSegment[]> {
        const response = await Http.getListeningHeatmap(publicId);
        if (response.isNotOk() || !response.result)
            throw new Error("Listening history unavailable");
        return response.result.segments;
    }

    countAt(
        segments: ListeningHeatmapSegment[],
        currentTime: number,
        completed: ListeningHeatmapInterval[] = [],
        active?: ListeningHeatmapInterval
    ): number {
        if (!Number.isFinite(currentTime) || currentTime < 0) return 0;
        const ms = currentTime * 1000;
        const last = segments.at(-1);
        const baseline =
            segments.find(
                (segment) => segment.startMs <= ms && segment.endMs > ms
            )?.count ?? (last?.endMs === ms ? last.count : 0);
        const closedCount = completed.filter(
            (interval) => interval.startMs <= ms && interval.endMs > ms
        ).length;
        // Include the active pass at the cursor without sampling a rounded chart edge.
        const activeCount =
            active && active.startMs <= ms && active.endMs >= ms ? 1 : 0;
        return baseline + closedCount + activeCount;
    }

    withPlayback(
        segments: ListeningHeatmapSegment[],
        intervals: ListeningHeatmapInterval[]
    ): ListeningHeatmapSegment[] {
        const events = new Map<number, number>();
        for (const segment of [
            ...segments,
            ...intervals.map((interval) => ({ ...interval, count: 1 })),
        ]) {
            if (segment.endMs <= segment.startMs) continue;
            events.set(
                segment.startMs,
                (events.get(segment.startMs) ?? 0) + segment.count
            );
            events.set(
                segment.endMs,
                (events.get(segment.endMs) ?? 0) - segment.count
            );
        }
        const boundaries = Array.from(events.keys()).sort((a, b) => a - b);
        const result: ListeningHeatmapSegment[] = [];
        let count = 0;
        for (let index = 0; index < boundaries.length - 1; index++) {
            const startMs = boundaries[index];
            const endMs = boundaries[index + 1];
            count += events.get(startMs) ?? 0;
            if (count <= 0) continue;
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
