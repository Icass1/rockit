"use client";

import { JSX, useMemo, useState } from "react";
import type { StatsHeatmapCellResponse } from "@/dto";

interface ListeningHeatmapProps {
    data: StatsHeatmapCellResponse[];
}

const CELL_SIZE = 18;
const CELL_GAP = 3;
const LEFT_PAD = 36;
const TOP_PAD = 28;
const HOURS_START = 8;
const HOURS_END = 23;
const DAYS = 7;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = [8, 10, 12, 14, 16, 18, 20, 22];

function cellColor(value: number, maxValue: number): string {
    if (value === 0) return "#262626";
    const intensity = Math.min(value / maxValue, 1);
    if (intensity < 0.2) return "#3d0d24";
    if (intensity < 0.4) return "#5e1538";
    if (intensity < 0.6) return "#8a1f50";
    if (intensity < 0.8) return "#c72d70";
    return "#ee1086";
}

interface TooltipState {
    hour: number;
    day: number;
    value: number;
    x: number;
    y: number;
}

export default function ListeningHeatmap({
    data,
}: ListeningHeatmapProps): JSX.Element {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    const numHours = HOURS_END - HOURS_START + 1;
    const maxValue = useMemo(
        () => Math.max(...data.map((d) => d.value), 1),
        [data]
    );

    const svgWidth = LEFT_PAD + numHours * (CELL_SIZE + CELL_GAP) + 8;
    const svgHeight = TOP_PAD + DAYS * (CELL_SIZE + CELL_GAP) + 8;

    const getVal = (hour: number, day: number): number => {
        const cell = data.find((d) => d.hour === hour && d.day === day);
        return cell?.value ?? 0;
    };

    return (
        <div className="relative flex justify-center pt-2">
            {tooltip && (
                <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-neutral-800/60 bg-neutral-900/95 px-3 py-1.5 shadow-xl backdrop-blur-md"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y - 36,
                    }}
                >
                    <span className="text-xs text-neutral-400">
                        {DAY_LABELS[tooltip.day]} {tooltip.hour}:00
                    </span>
                    <span className="mx-2 text-neutral-600">·</span>
                    <span className="text-sm font-medium text-white">
                        {tooltip.value > 0
                            ? `${tooltip.value} min`
                            : "No activity"}
                    </span>
                </div>
            )}

            <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full max-w-[560px]"
            >
                {HOUR_LABELS.map((hour) => {
                    const hourIndex = hour - HOURS_START;
                    return (
                        <text
                            key={`hl-${hour}`}
                            x={
                                LEFT_PAD +
                                hourIndex * (CELL_SIZE + CELL_GAP) +
                                CELL_SIZE / 2
                            }
                            y={16}
                            fill="#ffffff"
                            fontSize={11}
                            textAnchor="middle"
                            fontFamily="system-ui, sans-serif"
                        >
                            {hour}
                        </text>
                    );
                })}

                {DAY_LABELS.map((label, dayIndex) => (
                    <text
                        key={`dl-${dayIndex}`}
                        x={LEFT_PAD - 6}
                        y={
                            TOP_PAD +
                            dayIndex * (CELL_SIZE + CELL_GAP) +
                            CELL_SIZE / 2 +
                            3
                        }
                        fill="#ffffff"
                        fontSize={11}
                        textAnchor="end"
                        fontFamily="system-ui, sans-serif"
                    >
                        {label}
                    </text>
                ))}

                {Array.from({ length: DAYS }, (_, day) =>
                    Array.from({ length: numHours }, (_, hourOffset) => {
                        const hour = HOURS_START + hourOffset;
                        const x =
                            LEFT_PAD +
                            hourOffset * (CELL_SIZE + CELL_GAP);
                        const y =
                            TOP_PAD +
                            day * (CELL_SIZE + CELL_GAP);
                        const value = getVal(hour, day);
                        const key = `${hour}-${day}`;

                        return (
                            <rect
                                key={key}
                                x={x}
                                y={y}
                                width={CELL_SIZE}
                                height={CELL_SIZE}
                                rx={4}
                                ry={4}
                                fill={cellColor(value, maxValue)}
                                className="transition-[fill] duration-200"
                                style={{ cursor: "pointer" }}
                                onMouseEnter={(e) => {
                                    const rect = (
                                        e.currentTarget as SVGRectElement
                                    ).getBoundingClientRect();
                                    const parent =
                                        e.currentTarget
                                            .closest("div")!;
                                    const parentRect =
                                        parent.getBoundingClientRect();
                                    setTooltip({
                                        hour,
                                        day,
                                        value,
                                        x:
                                            rect.left +
                                            rect.width / 2 -
                                            parentRect.left,
                                        y: rect.top - parentRect.top,
                                    });
                                }}
                                onMouseLeave={() => setTooltip(null)}
                            />
                        );
                    })
                )}
            </svg>
        </div>
    );
}
