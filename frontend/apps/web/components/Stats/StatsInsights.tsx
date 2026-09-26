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
import StatsSection from "@/components/Stats/StatsSection";

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
        <StatsSection title="Your listening DNA" stagger={2}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative overflow-hidden rounded-3xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/20 via-neutral-900 to-neutral-950 p-6 sm:col-span-2">
                    <Sparkles
                        className="absolute top-5 right-5 text-fuchsia-300/50"
                        size={28}
                    />
                    <p className="text-xs font-semibold tracking-[0.2em] text-fuchsia-300 uppercase">
                        Prime time
                    </p>
                    <p className="mt-3 text-4xl font-bold text-white">
                        {formatHour(insights.peakHour)}
                    </p>
                    <p className="mt-1 text-sm text-neutral-400">
                        You listen most on {insights.peakDay ?? "—"}s
                    </p>
                </div>
                <div className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/20 via-neutral-900 to-neutral-950 p-6 sm:col-span-2">
                    <PersonalityIcon
                        className="absolute top-5 right-5 text-sky-300/50"
                        size={28}
                    />
                    <p className="text-xs font-semibold tracking-[0.2em] text-sky-300 uppercase">
                        Listening personality
                    </p>
                    <p className="mt-3 text-4xl font-bold text-white">
                        {personality.title}
                    </p>
                    <p className="mt-1 text-sm text-neutral-400">
                        {personality.detail}
                    </p>
                </div>
                {cards.map(({ icon: Icon, value, label }) => (
                    <div
                        key={label}
                        className="group rounded-2xl border border-white/6 bg-white/3 p-4 transition-colors hover:border-white/12 hover:bg-white/5"
                    >
                        <Icon
                            className="mb-5 text-neutral-600 transition-colors group-hover:text-(--color-rockit-pink)"
                            size={20}
                        />
                        <p className="text-2xl font-bold tracking-tight text-white">
                            {value}
                        </p>
                        <p className="mt-1 text-xs font-medium tracking-wide text-neutral-500 uppercase">
                            {label}
                        </p>
                    </div>
                ))}
            </div>
        </StatsSection>
    );
}
