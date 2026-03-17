"use client";

import { useState } from "react";
import type { HeatmapCell } from "@/components/Stats/mockStatsData";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function cellColor(value: number, max: number): string {
    if (value === 0) return "rgba(38,38,38,0.8)";
    const t = value / max;
    const alpha = 0.15 + t * 0.85;
    return `rgba(238,16,134,${alpha.toFixed(2)})`;
}

interface TooltipState {
    x: number;
    y: number;
    day: string;
    hour: number;
    value: number;
}

export default function ListeningHeatmap({ data }: { data: HeatmapCell[] }) {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    const lookup = new Map<string, number>();
    let maxVal = 0;
    for (const cell of data) {
        lookup.set(`${cell.day}-${cell.hour}`, cell.value);
        if (cell.value > maxVal) maxVal = cell.value;
    }

    const CELL_W = 18;
    const CELL_H = 18;
    const CELL_GAP = 2;
    const LEFT_PAD = 28;
    const TOP_PAD = 20;

    const svgW = LEFT_PAD + 24 * (CELL_W + CELL_GAP);
    const svgH = TOP_PAD + 7 * (CELL_H + CELL_GAP) + 4;

    return (
        <div className="relative w-full overflow-x-auto">
            <svg
                width={svgW}
                height={svgH}
                className="min-w-full"
                onMouseLeave={() => setTooltip(null)}
            >
                {DAYS.map((day, di) => (
                    <text
                        key={day}
                        x={LEFT_PAD - 4}
                        y={TOP_PAD + di * (CELL_H + CELL_GAP) + CELL_H / 2 + 4}
                        textAnchor="end"
                        fontSize={9}
                        fill="#737373"
                    >
                        {day}
                    </text>
                ))}

                {HOURS.filter((h) => h % 3 === 0).map((h) => (
                    <text
                        key={h}
                        x={LEFT_PAD + h * (CELL_W + CELL_GAP) + CELL_W / 2}
                        y={TOP_PAD - 6}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#737373"
                    >
                        {`${h}h`}
                    </text>
                ))}

                {DAYS.map((day, di) =>
                    HOURS.map((hour) => {
                        const val = lookup.get(`${di}-${hour}`) ?? 0;
                        const cx = LEFT_PAD + hour * (CELL_W + CELL_GAP);
                        const cy = TOP_PAD + di * (CELL_H + CELL_GAP);
                        return (
                            <rect
                                key={`${di}-${hour}`}
                                x={cx}
                                y={cy}
                                width={CELL_W}
                                height={CELL_H}
                                rx={3}
                                fill={cellColor(val, maxVal)}
                                className="cursor-pointer transition-opacity hover:opacity-80"
                                onMouseEnter={() => {
                                    setTooltip({
                                        x: cx + CELL_W / 2,
                                        y: cy,
                                        day,
                                        hour,
                                        value: val,
                                    });
                                }}
                            />
                        );
                    })
                )}

                {tooltip && tooltip.value > 0 && (
                    <g>
                        <rect
                            x={Math.min(tooltip.x - 40, svgW - 90)}
                            y={tooltip.y - 38}
                            width={80}
                            height={32}
                            rx={6}
                            fill="#171717"
                            stroke="#404040"
                            strokeWidth={1}
                        />
                        <text
                            x={Math.min(tooltip.x - 40, svgW - 90) + 40}
                            y={tooltip.y - 24}
                            textAnchor="middle"
                            fontSize={9}
                            fill="#a3a3a3"
                        >
                            {tooltip.day} {tooltip.hour}:00
                        </text>
                        <text
                            x={Math.min(tooltip.x - 40, svgW - 90) + 40}
                            y={tooltip.y - 11}
                            textAnchor="middle"
                            fontSize={11}
                            fontWeight="bold"
                            fill="white"
                        >
                            {tooltip.value} min
                        </text>
                    </g>
                )}
            </svg>
        </div>
    );
}
