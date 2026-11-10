"use client";

import { JSX, useMemo } from "react";
import type { StatsHeatmapCellResponse } from "@/dto";
import { localizedWeekdays } from "@rockit/shared";
import {
    useLanguage,
    useVocabulary,
} from "@/components/providers/VocabularyProvider";

interface ListeningHeatmapProps {
    data: StatsHeatmapCellResponse[];
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function cellColor(value: number, maxValue: number): string {
    if (value <= 0)
        return "color-mix(in srgb, var(--theme-foreground-strong) 4%, transparent)";
    const intensity = 10 + (value / maxValue) * 90;
    return `color-mix(in srgb, var(--theme-primary) ${intensity}%, transparent)`;
}

export default function ListeningHeatmap({
    data,
}: ListeningHeatmapProps): JSX.Element {
    const vocabulary = useVocabulary();
    const lang = useLanguage();
    const days = localizedWeekdays(lang);

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
                            className="text-disabled-foreground text-center text-[10px] font-medium"
                        >
                            {hour % 3 === 0 ? `${hour}:00` : ""}
                        </div>
                    ))}
                    {days.map((day, dayIndex) => (
                        <div key={day} className="contents">
                            <div className="text-subtle-foreground flex items-center text-xs font-medium">
                                {day}
                            </div>
                            {HOURS.map((hour) => {
                                const value =
                                    values.get(`${dayIndex}-${hour}`) ?? 0;
                                return (
                                    <div
                                        key={`${day}-${hour}`}
                                        title={vocabulary.STATS_HEATMAP_CELL.replace(
                                            "{day}",
                                            day
                                        )
                                            .replace("{hour}", `${hour}:00`)
                                            .replace(
                                                "{minutes}",
                                                value.toLocaleString(lang)
                                            )}
                                        aria-label={vocabulary.STATS_HEATMAP_CELL.replace(
                                            "{day}",
                                            day
                                        )
                                            .replace("{hour}", `${hour}:00`)
                                            .replace(
                                                "{minutes}",
                                                value.toLocaleString(lang)
                                            )}
                                        className="hover:ring-foreground-strong/40 aspect-square rounded-[5px] transition-transform hover:scale-125 hover:ring-2"
                                        style={{
                                            backgroundColor: cellColor(
                                                value,
                                                maxValue
                                            ),
                                        }}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
                <div className="text-disabled-foreground mt-5 flex items-center justify-end gap-2 text-[10px] font-medium">
                    <span>{vocabulary.LISTENING_HEATMAP_LESS}</span>
                    {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
                        <span
                            key={intensity}
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: cellColor(intensity, 1) }}
                        />
                    ))}
                    <span>{vocabulary.LISTENING_HEATMAP_MORE}</span>
                </div>
            </div>
        </div>
    );
}
