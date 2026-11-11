import { useId, type JSX } from "react";
import type { ListeningHeatmapSegment } from "@/dto";
import { listeningHeatmapCurve } from "@/lib/utils/listeningHeatmapCurve";

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
    const line = listeningHeatmapCurve(segments, duration, peak);

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
                        stroke="none"
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
