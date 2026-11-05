"use client";

import { JSX } from "react";
import type { StatsInsightsResponse } from "@/dto";
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

interface StatsInsightsProps {
    insights: StatsInsightsResponse;
}

function formatDuration(ms: number): string {
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
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
    const personality =
        insights.nightOwlMinutes > insights.earlyBirdMinutes
            ? {
                  icon: Moon,
                  title: "Night owl",
                  detail: `${Math.round(insights.nightOwlMinutes)} late-night minutes`,
              }
            : {
                  icon: Sunrise,
                  title: "Early bird",
                  detail: `${Math.round(insights.earlyBirdMinutes)} morning minutes`,
              };
    const PersonalityIcon = personality.icon;
    const cards = [
        {
            icon: CalendarDays,
            value: insights.activeDays,
            label: "Active days",
        },
        {
            icon: Flame,
            value: `${insights.longestStreak}d`,
            label: "Best streak",
        },
        {
            icon: Clock3,
            value: formatDuration(insights.longestSessionMs),
            label: "Longest session",
        },
        {
            icon: Zap,
            value: formatDuration(insights.averageSessionMs),
            label: "Average session",
        },
        {
            icon: Target,
            value: `${insights.completionRate}%`,
            label: "Completion rate",
        },
        {
            icon: Repeat2,
            value: `${insights.replayRate}%`,
            label: "Replay rate",
        },
        {
            icon: Compass,
            value: insights.discoveryCount,
            label: "New discoveries",
        },
        { icon: Heart, value: insights.likesAdded, label: "Likes added" },
        { icon: Library, value: insights.libraryAdds, label: "Library adds" },
        { icon: SkipForward, value: insights.skips, label: "Skips" },
        { icon: MousePointerClick, value: insights.seekCount, label: "Seeks" },
        {
            icon: FastForward,
            value: `${Math.round(insights.minutesSkipped)}m`,
            label: "Seek distance",
        },
    ];

    return (
        <section>
            <div className="mb-5">
                <p className="text-primary text-[10px] font-semibold tracking-[0.22em] uppercase">
                    Listening DNA
                </p>
                <h2 className="text-foreground-strong mt-1 text-2xl font-bold">
                    The habits behind the music
                </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="border-primary/20 from-primary/20 via-secondary to-background relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 sm:col-span-2">
                    <Sparkles
                        className="text-primary-soft/50 absolute top-5 right-5"
                        size={28}
                    />
                    <p className="text-primary-soft text-xs font-semibold tracking-[0.2em] uppercase">
                        Prime time
                    </p>
                    <p className="text-foreground-strong mt-3 text-4xl font-bold">
                        {formatHour(insights.peakHour)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        You listen most on {insights.peakDay ?? "—"}s
                    </p>
                </div>
                <div className="border-info/20 from-info/20 via-secondary to-background relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 sm:col-span-2">
                    <PersonalityIcon
                        className="text-info-foreground/50 absolute top-5 right-5"
                        size={28}
                    />
                    <p className="text-info-foreground text-xs font-semibold tracking-[0.2em] uppercase">
                        Listening personality
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
