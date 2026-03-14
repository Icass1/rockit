"use client";

import { useState } from "react";
import { useStore } from "@nanostores/react";
import { BarChart2, User, Users } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import UserStats from "@/components/Stats/UserStats";

type Section = "user" | "general" | "friends";

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

    return (
        <div className="flex flex-col">
            {/* Header row */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        {sectionTitle[section]}
                    </h1>
                    <p className="mt-0.5 text-sm text-neutral-500">
                        Showing data from the last 7 days
                    </p>
                </div>

                {/* Tab switcher */}
                <div className="flex items-center gap-1 self-start rounded-xl bg-neutral-900 p-1 md:self-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            className={[
                                "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                                section === tab.id
                                    ? "bg-[#ee1086] text-white shadow-sm"
                                    : "text-neutral-400 hover:text-white",
                            ].join(" ")}
                            onClick={() => setSection(tab.id)}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {section === "user" && <UserStats />}

            {section === "general" && (
                <EmptySection label="General stats coming soon" />
            )}

            {section === "friends" && (
                <EmptySection label="Friends comparison coming soon" />
            )}
        </div>
    );
}
