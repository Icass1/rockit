"use client";

import { useState } from "react";
import { useStore } from "@nanostores/react";
import { BarChart2, User, Users } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import UserStats from "@/components/Stats/UserStats";

type Section = "user" | "general" | "friends";
type DateRange = "7d" | "30d" | "1y" | "custom";

const RANGE_OPTIONS: { id: DateRange; label: string }[] = [
    { id: "7d", label: "7 days" },
    { id: "30d", label: "30 days" },
    { id: "1y", label: "1 year" },
    { id: "custom", label: "Custom" },
];

function EmptySection({ label }: { label: string }) {
    return (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-800 text-center">
            <BarChart2 className="h-8 w-8 text-neutral-700" />
            <p className="text-sm font-semibold text-neutral-600">{label}</p>
            <p className="text-xs text-neutral-700">
                Available once backend stats endpoints are ready
            </p>
        </div>
    );
}

export default function StatsClient() {
    const [section, setSection] = useState<Section>("user");
    const [range, setRange] = useState<DateRange>("7d");
    const [customStart, setCustomStart] = useState<string>("");
    const [customEnd, setCustomEnd] = useState<string>("");
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const tabs: { id: Section; label: string; icon: React.ReactNode }[] = [
        {
            id: "user",
            label: $vocabulary.USER ?? "User",
            icon: <User className="h-3.5 w-3.5" />,
        },
        {
            id: "general",
            label: $vocabulary.GENERAL ?? "General",
            icon: <BarChart2 className="h-3.5 w-3.5" />,
        },
        {
            id: "friends",
            label: $vocabulary.FRIENDS ?? "Friends",
            icon: <Users className="h-3.5 w-3.5" />,
        },
    ];

    const sectionTitle: Record<Section, string> = {
        user: $vocabulary.USER_STATS ?? "User stats",
        general: $vocabulary.GENERAL_STATS ?? "General stats",
        friends: $vocabulary.FRIENDS_STATS ?? "Friends stats",
    };

    const rangeLabel = (() => {
        if (range === "custom" && customStart && customEnd) {
            return `${customStart} → ${customEnd}`;
        }
        switch (range) {
            case "7d":
                return "7 days";
            case "30d":
                return "30 days";
            case "1y":
                return "1 year";
            default:
                return "7 days";
        }
    })();

    return (
        <div className="flex flex-col px-4 md:px-8">
            {/* Header */}
            <div className="mb-3 md:mb-6">
                {/* Title */}
                <h1 className="text-xl font-bold text-white md:text-2xl">
                    {sectionTitle[section]}
                </h1>

                {/* Subtitle */}
                <p className="mt-0.5 text-xs text-neutral-500 md:text-sm">
                    Showing stats for {rangeLabel}
                </p>

                {/* Range pills + Tabs — same row */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                        {RANGE_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setRange(opt.id)}
                                className={[
                                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all md:px-3 md:py-1 md:text-xs",
                                    range === opt.id
                                        ? "bg-[#ee1086] text-white"
                                        : "bg-neutral-800 text-neutral-400 hover:text-white",
                                ].join(" ")}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1 rounded-xl bg-neutral-900 p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSection(tab.id)}
                                className={[
                                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all md:px-4 md:py-2 md:text-sm",
                                    section === tab.id
                                        ? "bg-[#ee1086] text-white shadow-sm"
                                        : "text-neutral-400 hover:text-white",
                                ].join(" ")}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">
                                    {tab.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom inputs — extra row only when needed */}
                {range === "custom" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-[#ee1086] focus:outline-none"
                        />
                        <span className="text-xs text-neutral-600">→</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-[#ee1086] focus:outline-none"
                        />
                    </div>
                )}
            </div>

            {/* Content */}
            {section === "user" && (
                <UserStats
                    range={range}
                    customStart={customStart}
                    customEnd={customEnd}
                />
            )}
            {section === "general" && (
                <EmptySection label="General stats coming soon" />
            )}
            {section === "friends" && (
                <EmptySection label="Friends comparison coming soon" />
            )}
        </div>
    );
}
