"use client";

import { JSX, useMemo, useRef, useState } from "react";
import type { StatsMinutesEntryResponse } from "@/dto";

interface MinutesBarChartProps {
    data: StatsMinutesEntryResponse[];
}

const CHART_HEIGHT = 280;
const LEFT_PAD = 52;
const RIGHT_PAD = 12;
const BOTTOM_PAD = 40;
const BAR_GAP = 8;
const MIN_BAR_W = 28;
const MAX_BAR_W = 72;

interface TooltipState {
    x: number;
    label: string;
    value: number;
}

export default function MinutesBarChart({
    data,
}: MinutesBarChartProps): JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const { maxVal, bars, yLabels, svgWidth, svgHeight } = useMemo(() => {
        const maxVal = Math.max(...data.map((d) => d.minutes), 1);
        const count = data.length;

        const containerW =
            containerRef.current?.clientWidth ?? 600;
        const availW = containerW - LEFT_PAD - RIGHT_PAD;
        const rawW = (availW - (count - 1) * BAR_GAP) / count;
        const barW = Math.min(MAX_BAR_W, Math.max(MIN_BAR_W, rawW));
        const totalW = LEFT_PAD + count * (barW + BAR_GAP) + RIGHT_PAD;

        const svgW = Math.max(totalW, containerW);
        const svgH = CHART_HEIGHT + BOTTOM_PAD;

        const yLabels = [0, 0.25, 0.5, 0.75, 1].map(
            (f) => Math.round(maxVal * f)
        );

        const bars = data.map((entry, i) => {
            const barH = (entry.minutes / maxVal) * CHART_HEIGHT;
            const x = LEFT_PAD + i * (barW + BAR_GAP);
            const y = CHART_HEIGHT - barH;
            return { x, y, barH, barW, entry, index: i };
        });

        return { maxVal, bars, yLabels, svgWidth: svgW, svgHeight: svgH };
    }, [data]);

    if (data.length === 0) {
        return (
            <div className="flex h-[280px] items-center justify-center">
                <p className="text-sm text-neutral-600">No data available</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative">
            {tooltip && (
                <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-neutral-800/60 bg-neutral-900/90 px-4 py-2.5 shadow-lg backdrop-blur-md"
                    style={{ left: tooltip.x, top: -10 }}
                >
                    <p className="whitespace-nowrap text-xs text-neutral-400">
                        {tooltip.label}
                    </p>
                    <p className="whitespace-nowrap text-base font-bold text-white">
                        {tooltip.value.toFixed(1)} min
                    </p>
                </div>
            )}

            <svg
                width="100%"
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="overflow-visible"
            >
                {yLabels.map((val, i) => (
                    <g key={`y-${i}`}>
                        <text
                            x={LEFT_PAD - 10}
                            y={CHART_HEIGHT - (i / (yLabels.length - 1)) * CHART_HEIGHT + 5}
                            fill="#737373"
                            fontSize={12}
                            textAnchor="end"
                            className="tabular-nums"
                        >
                            {val}
                        </text>
                        <line
                            x1={LEFT_PAD}
                            y1={CHART_HEIGHT - (i / (yLabels.length - 1)) * CHART_HEIGHT}
                            x2={svgWidth - RIGHT_PAD}
                            y2={CHART_HEIGHT - (i / (yLabels.length - 1)) * CHART_HEIGHT}
                            stroke="rgba(38,38,38,0.4)"
                            strokeWidth={1}
                        />
                    </g>
                ))}

                {bars.map((bar) => (
                    <g key={bar.index}>
                        <rect
                            x={bar.x}
                            y={bar.y}
                            width={bar.barW}
                            height={bar.barH}
                            rx={4}
                            ry={4}
                            fill={
                                hoveredIndex === bar.index
                                    ? "#ee1086"
                                    : hoveredIndex !== null
                                        ? "rgba(238,16,134,0.2)"
                                        : "rgba(238,16,134,0.6)"
                            }
                            className="transition-[fill] duration-200"
                            onMouseEnter={() => {
                                setHoveredIndex(bar.index);
                                const startDate = new Date(bar.entry.start);
                                const endDate = new Date(bar.entry.end);
                                const label = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                                setTooltip({
                                    x: bar.x + bar.barW / 2,
                                    label,
                                    value: bar.entry.minutes,
                                });
                            }}
                            onMouseLeave={() => {
                                setHoveredIndex(null);
                                setTooltip(null);
                            }}
                            style={{ cursor: "pointer" }}
                        />
                        <text
                            x={bar.x + bar.barW / 2}
                            y={CHART_HEIGHT + 18}
                            fill="#737373"
                            fontSize={10}
                            textAnchor="middle"
                        >
                            {bar.entry.label}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}
