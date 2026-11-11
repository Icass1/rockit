import type { ListeningHeatmapSegment } from "@/dto";

export function listeningHeatmapCurve(
    segments: ListeningHeatmapSegment[],
    duration: number,
    peak: number
): string {
    const end = duration * 1000;
    if (!(end > 0) || !(peak > 0)) return "";
    const spans: ListeningHeatmapSegment[] = [];
    const append = (startMs: number, endMs: number, count: number): void => {
        if (endMs <= startMs) return;
        const previous = spans.at(-1);
        if (previous?.count === count && previous.endMs === startMs)
            previous.endMs = endMs;
        else spans.push({ startMs, endMs, count });
    };
    let previousEnd = 0;
    for (const segment of segments) {
        const startMs = Math.max(previousEnd, segment.startMs);
        const endMs = Math.min(end, segment.endMs);
        if (endMs <= startMs) continue;
        append(previousEnd, startMs, 0);
        append(startMs, endMs, segment.count);
        previousEnd = endMs;
    }
    append(previousEnd, end, 0);

    const x = (ms: number): number => (ms / end) * 1000;
    const y = (count: number): number => 98 - (count / peak) * 94;
    let line = `M 0,${y(spans[0].count)}`;
    for (let index = 1; index < spans.length; index++) {
        const previous = spans[index - 1];
        const current = spans[index];
        const boundary = x(current.startMs);
        // Round only near count changes; preserve each segment's flat plateau.
        const radius = Math.min(
            10,
            x(previous.endMs - previous.startMs) / 4,
            x(current.endMs - current.startMs) / 4
        );
        line += ` L ${boundary - radius},${y(previous.count)}`;
        line += ` C ${boundary},${y(previous.count)} ${boundary},${y(current.count)} ${boundary + radius},${y(current.count)}`;
    }
    return `${line} L 1000,${y(spans.at(-1)!.count)}`;
}
