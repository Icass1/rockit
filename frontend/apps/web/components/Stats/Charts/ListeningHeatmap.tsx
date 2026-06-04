"use client";

import { JSX, useMemo, useState } from "react";
import type { StatsHeatmapCellResponse } from "@/dto";

interface ListeningHeatmapProps {
    data: StatsHeatmapCellResponse[];
}

const CELL_SIZE = 22;
const CELL_GAP = 4;
const LEFT_PAD = 48;
const TOP_PAD = 32;
const HOURS_START = 8;
const HOURS_END = 23;
const DAYS = 7;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = [8, 10, 12, 14, 16, 18, 20, 22];

function cellColor(value: number, maxValue: number): string {
    if (value === 0) return "rgba(38,38,38,0.15)";
    const intensity = Math.min(value / maxValue, 1);
    const alpha = 0.15 + intensity * 0.85;
    return `rgba(238,16,134,${alpha})`;
}

interface TooltipState {
    hour: number;
    day: number;
    value: number;
}

export default function ListeningHeatmap({
    data,
}: ListeningHeatmapProps): JSX.Element {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const [selectedCell, setSelectedCell] = useState<string | null>(null);

    const { maxValue, cells, heatmapWidth, heatmapHeight } = useMemo(() => {
        const maxValue = Math.max(...data.map((d) => d.value), 1);
        const numHours = HOURS_END - HOURS_START + 1;
        const w = LEFT_PAD + numHours * (CELL_SIZE + CELL_GAP);
        const h = TOP_PAD + DAYS * (CELL_SIZE + CELL_GAP);

        const getVal = (hour: number, day: number): number => {
            const cell = data.find((d) => d.hour === hour && d.day === day);
            return cell?.value ?? 0;
        };

        const cells = Array.from({ length: DAYS }, (_, day) =>
            Array.from({ length: numHours }, (_, hourOffset) => {
                const hour = HOURS_START + hourOffset;
                const x = LEFT_PAD + hourOffset * (CELL_SIZE + CELL_GAP);
                const y = TOP_PAD + day * (CELL_SIZE + CELL_GAP);
                return { hour, day, x, y, value: getVal(hour, day) };
            })
        ).flat();

        return { maxValue, cells, heatmapWidth: w, heatmapHeight: h };
    }, [data]);

    return (
        <div className="relative overflow-x-auto pt-7">
            {tooltip && (
                <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-neutral-800/60 bg-neutral-900/90 px-3 py-1.5 shadow-lg backdrop-blur-md">
                    <span className="text-xs text-neutral-500 md:text-sm">
                        {DAY_LABELS[tooltip.day]} {tooltip.hour}:00
                    </span>
                    <span className="mx-2 text-neutral-600">·</span>
                    <span className="text-sm font-medium text-white md:text-base">
                        {tooltip.value > 0
                            ? `${tooltip.value} min`
                            : "No activity"}
                    </span>
                </div>
            )}

            <svg
                width={heatmapWidth}
                height={heatmapHeight}
                className="mx-auto"
            >
                {HOUR_LABELS.map((hour) => {
                    const hourIndex = hour - HOURS_START;
                    return (
                        <text
                            key={`hl-${hour}`}
                            x={LEFT_PAD + hourIndex * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2}
                            y={18}
                            fill="#737373"
                            fontSize={11}
                            textAnchor="middle"
                        >
                            {hour}
                        </text>
                    );
                })}

                {DAY_LABELS.map((label, dayIndex) => (
                    <text
                        key={`dl-${dayIndex}`}
                        x={LEFT_PAD - 8}
                        y={TOP_PAD + dayIndex * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2 + 4}
                        fill="#737373"
                        fontSize={12}
                        textAnchor="end"
                    >
                        {label}
                    </text>
                ))}

                {cells.map((cell) => {
                    const key = `${cell.hour}-${cell.day}`;
                    const isSelected = selectedCell === key;
                    return (
                        <rect
                            key={key}
                            x={cell.x}
                            y={cell.y}
                            width={CELL_SIZE}
                            height={CELL_SIZE}
                            rx={5}
                            ry={5}
                            fill={cellColor(cell.value, maxValue)}
                            stroke={isSelected ? "#ffffff" : "transparent"}
                            strokeWidth={isSelected ? 2 : 0}
                            className="transition-[stroke,fill] duration-150"
                            style={{ cursor: "pointer" }}
                            onMouseEnter={() => {
                                setTooltip({
                                    hour: cell.hour,
                                    day: cell.day,
                                    value: cell.value,
                                });
                            }}
                            onMouseLeave={() => {
                                setTooltip(null);
                            }}
                            onClick={() => {
                                setSelectedCell(
                                    isSelected ? null : key
                                );
                            }}
                        />
                    );
                })}
            </svg>
        </div>
    );
}
