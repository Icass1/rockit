import type {
    StatsRange,
    StatsRangeOption,
} from "@/models/interfaces/statsPresentation";
import type { Vocabulary } from "@/models/types/vocabulary";

export function statsRangeOptions(vocabulary: Vocabulary): StatsRangeOption[] {
    return [
        { value: "7d", label: vocabulary.MOBILE_STATS_WEEK },
        { value: "30d", label: vocabulary.MOBILE_STATS_MONTH },
        { value: "1y", label: vocabulary.MOBILE_STATS_YEAR },
        { value: "all", label: vocabulary.STATS_RANGE_ALL },
        { value: "custom", label: vocabulary.MOBILE_STATS_CUSTOM },
    ];
}
export function formatStatsRange(
    range: StatsRange,
    vocabulary: Vocabulary,
    lang: string,
    start?: string | Date,
    end?: string | Date
): string {
    if (range !== "custom")
        return statsRangeOptions(vocabulary).find(
            (option) => option.value === range
        )!.label;
    return vocabulary.MOBILE_STATS_RANGE.replace(
        "{from}",
        start ? new Date(start).toLocaleDateString(lang) : "…"
    ).replace("{to}", end ? new Date(end).toLocaleDateString(lang) : "…");
}
export function statsDateBoundary(date: Date, edge: "start" | "end"): string {
    const value = new Date(date);
    if (edge === "start") value.setHours(0, 0, 0, 0);
    else value.setHours(23, 59, 59, 999);
    return value.toISOString();
}
export function formatListeningDuration(minutes: number, lang: string): string {
    const total = Math.max(0, Math.round(minutes));
    const units: [number, "day" | "hour" | "minute"][] =
        total >= 1440
            ? [
                  [Math.floor(total / 1440), "day"],
                  [Math.floor((total % 1440) / 60), "hour"],
              ]
            : total >= 60
              ? [
                    [Math.floor(total / 60), "hour"],
                    [total % 60, "minute"],
                ]
              : [[total, "minute"]];
    return units
        .map(([value, unit]) =>
            new Intl.NumberFormat(lang, {
                style: "unit",
                unit,
                unitDisplay: "narrow",
            }).format(value)
        )
        .join(" ");
}

/** Stable labels and formatting shared by desktop cards and the mobile insights panel. */
export function statsInsightMetrics(
    insights: import("@/dto").StatsInsightsResponse,
    vocabulary: Vocabulary,
    lang: string
): import("@/models/interfaces/statsPresentation").StatsInsightMetric[] {
    const number = (value: number) => value.toLocaleString(lang);
    return [
        {
            key: "activeDays",
            label: vocabulary.STATS_ACTIVE_DAYS,
            value: number(insights.activeDays),
        },
        {
            key: "longestStreak",
            label: vocabulary.STATS_BEST_STREAK,
            value: new Intl.NumberFormat(lang, {
                style: "unit",
                unit: "day",
                unitDisplay: "narrow",
            }).format(insights.longestStreak),
        },
        {
            key: "longestSessionMs",
            label: vocabulary.STATS_LONGEST_SESSION,
            value: formatListeningDuration(
                insights.longestSessionMs / 60000,
                lang
            ),
        },
        {
            key: "averageSessionMs",
            label: vocabulary.STATS_AVERAGE_SESSION,
            value: formatListeningDuration(
                insights.averageSessionMs / 60000,
                lang
            ),
        },
        {
            key: "completionRate",
            label: vocabulary.STATS_COMPLETION_RATE,
            value: `${number(insights.completionRate)}%`,
        },
        {
            key: "replayRate",
            label: vocabulary.STATS_REPLAY_RATE,
            value: `${number(insights.replayRate)}%`,
        },
        {
            key: "discoveryCount",
            label: vocabulary.STATS_DISCOVERIES,
            value: number(insights.discoveryCount),
        },
        {
            key: "likesAdded",
            label: vocabulary.STATS_LIKES_ADDED,
            value: number(insights.likesAdded),
        },
        {
            key: "libraryAdds",
            label: vocabulary.STATS_LIBRARY_ADDS,
            value: number(insights.libraryAdds),
        },
        {
            key: "skips",
            label: vocabulary.STATS_SKIPS,
            value: number(insights.skips),
        },
        {
            key: "seekCount",
            label: vocabulary.STATS_SEEKS,
            value: number(insights.seekCount),
        },
        {
            key: "minutesSkipped",
            label: vocabulary.STATS_SEEK_DISTANCE,
            value: formatListeningDuration(insights.minutesSkipped, lang),
        },
    ];
}
