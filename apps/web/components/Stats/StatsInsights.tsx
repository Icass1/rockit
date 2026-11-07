"use client";

import { JSX } from "react";
import type { StatsInsightsResponse } from "@/dto";
import { localizedWeekdays, statsInsightMetrics } from "@rockit/shared";
import {
    CalendarDays,
    Clock3,
    Compass,
    FastForward,
    Flame,
    Heart,
    Library,
    Moon,
    MousePointerClick,
    Repeat2,
    SkipForward,
    Sparkles,
    Sunrise,
    Target,
    Zap,
} from "lucide-react";
import {
    useLanguage,
    useVocabulary,
} from "@/components/providers/VocabularyProvider";

interface StatsInsightsProps {
    insights: StatsInsightsResponse;
}

function formatHour(hour: number | null): string {
    if (hour === null) return "—";
    return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(2024, 0, 1, hour)));
}

export default function StatsInsights({
    insights,
}: StatsInsightsProps): JSX.Element {
    const vocabulary = useVocabulary();
    const lang = useLanguage();

    const personality =
        insights.nightOwlMinutes > insights.earlyBirdMinutes
            ? {
                  icon: Moon,
                  title: vocabulary.STATS_NIGHT_OWL,
                  detail: vocabulary.STATS_NIGHT_MINUTES.replace(
                      "{minutes}",
                      Math.round(insights.nightOwlMinutes).toLocaleString(lang)
                  ),
              }
            : {
                  icon: Sunrise,
                  title: vocabulary.STATS_EARLY_BIRD,
                  detail: vocabulary.STATS_MORNING_MINUTES.replace(
                      "{minutes}",
                      Math.round(insights.earlyBirdMinutes).toLocaleString(lang)
                  ),
              };
    const PersonalityIcon = personality.icon;
    const icons = {
        activeDays: CalendarDays,
        longestStreak: Flame,
        longestSessionMs: Clock3,
        averageSessionMs: Zap,
        completionRate: Target,
        replayRate: Repeat2,
        discoveryCount: Compass,
        likesAdded: Heart,
        libraryAdds: Library,
        skips: SkipForward,
        seekCount: MousePointerClick,
        minutesSkipped: FastForward,
    };
    const cards = statsInsightMetrics(insights, vocabulary, lang).map(
        (metric) => ({
            ...metric,
            icon: icons[metric.key as keyof typeof icons],
        })
    );
    const peakDayIndex = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ].indexOf(insights.peakDay ?? "");
    const peakDay =
        peakDayIndex >= 0 ? localizedWeekdays(lang)[peakDayIndex] : "—";

    return (
        <section>
            <div className="mb-5">
                <p className="text-primary text-[10px] font-semibold tracking-[0.22em] uppercase">
                    {vocabulary.STATS_DNA}
                </p>
                <h2 className="text-foreground-strong mt-1 text-2xl font-bold">
                    {vocabulary.STATS_HABITS}
                </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="border-primary/20 from-primary/20 via-secondary to-background relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 sm:col-span-2">
                    <Sparkles
                        className="text-primary-soft/50 absolute top-5 right-5"
                        size={28}
                    />
                    <p className="text-primary-soft text-xs font-semibold tracking-[0.2em] uppercase">
                        {vocabulary.STATS_PRIME_TIME}
                    </p>
                    <p className="text-foreground-strong mt-3 text-4xl font-bold">
                        {formatHour(insights.peakHour)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {vocabulary.STATS_PEAK_DAY.replace("{day}", peakDay)}
                    </p>
                </div>
                <div className="border-info/20 from-info/20 via-secondary to-background relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 sm:col-span-2">
                    <PersonalityIcon
                        className="text-info-foreground/50 absolute top-5 right-5"
                        size={28}
                    />
                    <p className="text-info-foreground text-xs font-semibold tracking-[0.2em] uppercase">
                        {vocabulary.STATS_PERSONALITY}
                    </p>
                    <p className="text-foreground-strong mt-3 text-4xl font-bold">
                        {personality.title}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {personality.detail}
                    </p>
                </div>
                {cards.map(({ icon: Icon, value, label }) => (
                    <div
                        key={label}
                        className="group border-foreground-strong/6 bg-foreground-strong/3 hover:border-foreground-strong/12 hover:bg-foreground-strong/5 rounded-2xl border p-4 transition-colors"
                    >
                        <Icon
                            className="text-disabled-foreground group-hover:text-primary mb-5 transition-colors"
                            size={20}
                        />
                        <p className="text-foreground-strong text-2xl font-bold tracking-tight">
                            {value}
                        </p>
                        <p className="text-subtle-foreground mt-1 text-xs font-medium tracking-wide uppercase">
                            {label}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
