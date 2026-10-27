"use client";

import { JSX, useMemo } from "react";
import type { StatsHeatmapCellResponse } from "@/dto";

interface ListeningHeatmapProps {
    data: StatsHeatmapCellResponse[];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function cellColor(value: number, maxValue: number): string {
    if (value <= 0) return "bg-white/4";
    const intensity = value / maxValue;
    if (intensity < 0.2) return "bg-fuchsia-950";
    if (intensity < 0.4) return "bg-fuchsia-900";
    if (intensity < 0.6) return "bg-fuchsia-700";
    if (intensity < 0.8) return "bg-fuchsia-500";
    return "bg-(--color-rockit-pink)";
}

export default function ListeningHeatmap({
    data,
}: ListeningHeatmapProps): JSX.Element {
    const { values, maxValue } = useMemo(() => {
        const indexed = new Map(
            data.map((cell) => [`${cell.day}-${cell.hour}`, cell.value])
        );
        return {
            values: indexed,
            maxValue: Math.max(...data.map((cell) => cell.value), 1),
        };
    }, [data]);

    return (
        <div className="overflow-x-auto pb-2">
            <div className="min-w-205">
                <div className="grid grid-cols-[3rem_repeat(24,minmax(1.5rem,1fr))] gap-1.5">
                    <div />
                    {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="text-center text-[10px] font-medium text-neutral-600"
                        >
                            {hour % 3 === 0 ? `${hour}:00` : ""}
                        </div>
                    ))}
                    {DAY_LABELS.map((day, dayIndex) => (
                        <div key={day} className="contents">
                            <div className="flex items-center text-xs font-medium text-neutral-500">
                                {day}
                            </div>
                            {HOURS.map((hour) => {
                                const value =
                                    values.get(`${dayIndex}-${hour}`) ?? 0;
                                return (
                                    <div
                                        key={`${day}-${hour}`}
                                        title={`${day} ${hour.toString().padStart(2, "0")}:00 · ${value} min`}
                                        aria-label={`${day} at ${hour}:00, ${value} minutes listened`}
                                        className={`aspect-square rounded-[5px] transition-transform hover:scale-125 hover:ring-2 hover:ring-white/40 ${cellColor(value, maxValue)}`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
                <div className="mt-5 flex items-center justify-end gap-2 text-[10px] font-medium text-neutral-600">
                    <span>Less</span>
                    {[
                        "bg-white/4",
                        "bg-fuchsia-950",
                        "bg-fuchsia-700",
                        "bg-(--color-rockit-pink)",
                    ].map((color) => (
                        <span
                            key={color}
                            className={`h-3 w-3 rounded-sm ${color}`}
                        />
                    ))}
                    <span>More</span>
                </div>
            </div>
        </div>
    );
}
