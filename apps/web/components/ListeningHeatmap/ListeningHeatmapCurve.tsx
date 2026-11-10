import { useId, type JSX } from "react";
import type { ListeningHeatmapSegment } from "@/dto";

interface ListeningHeatmapCurveProps {
    segments: ListeningHeatmapSegment[];
    duration: number;
    peak: number;
    className?: string;
}

export default function ListeningHeatmapCurve({
    segments,
    duration,
    peak,
    className,
}: ListeningHeatmapCurveProps): JSX.Element {
    const gradientId = useId();
    const end = Math.max(0, duration * 1000);
    const points: { x: number; y: number }[] = [];
    const addPoint = (ms: number, count: number): void => {
        points.push({
            x: (ms / end) * 1000,
            y: 98 - (count / peak) * 94,
        });
    };

    if (end > 0 && peak > 0) {
        addPoint(0, segments[0]?.startMs === 0 ? segments[0].count : 0);
        let previousEnd = 0;
        for (const segment of segments) {
            // Keep unheard gaps at the baseline and samples on their actual times.
            if (segment.startMs > previousEnd) {
                addPoint(previousEnd, 0);
                addPoint(segment.startMs, 0);
            }
            addPoint((segment.startMs + segment.endMs) / 2, segment.count);
            previousEnd = segment.endMs;
        }
        if (previousEnd < end) addPoint(previousEnd, 0);
        addPoint(end, previousEnd === end ? (segments.at(-1)?.count ?? 0) : 0);
    }

    // Horizontal Bézier tangents keep the curve smooth without overshooting counts.
    const line = points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x},${point.y}`;
        const previous = points[index - 1];
        const middle = (previous.x + point.x) / 2;
        return `${path} C ${middle},${previous.y} ${middle},${point.y} ${point.x},${point.y}`;
    }, "");

    return (
        <svg
            viewBox="0 0 1000 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            className={className}
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                        offset="0%"
                        stopColor="var(--rockit-pink)"
                        stopOpacity="0.6"
                    />
                    <stop
                        offset="100%"
                        stopColor="var(--rockit-pink)"
                        stopOpacity="0"
                    />
                </linearGradient>
            </defs>
            {line && (
                <>
                    <path
                        d={`${line} L 1000,100 L 0,100 Z`}
                        fill={`url(#${gradientId})`}
                    />
                    <path
                        d={line}
                        fill="none"
                        stroke="var(--rockit-pink)"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                    />
                </>
            )}
        </svg>
    );
}
