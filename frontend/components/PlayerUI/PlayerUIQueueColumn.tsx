"use client";

import { useRef, useState } from "react";
import { RockItSongQueue } from "@/lib/rockit/rockItSongQueue";
import { PlayerUIQueueList } from "@/components/PlayerUI/PlayerUIQueueList";
import { PlayerUIRelatedTab } from "@/components/PlayerUI/PlayerUIRelatedTab";
import { Lang } from "@/types/lang";

interface PlayerUIQueueColumnProps {
    queue: RockItSongQueue[];
    lang: Lang;
}

export function PlayerUIQueueColumn({ queue, lang }: PlayerUIQueueColumnProps) {
    const [currentTab, setCurrentTab] = useState<"queue" | "recommended">(
        "queue"
    );
    const [queueScroll, setQueueScroll] = useState(0);
    const queueDivRef = useRef<HTMLDivElement>(null);

    return (
        <div className="z-10 flex h-full flex-col overflow-hidden bg-gradient-to-r from-[rgba(0,0,0,0)] to-[rgba(0,0,0,0.5)] select-none">
            {/* Tab selector */}
            <div className="relative flex items-center justify-center gap-10 border-b border-white pt-6 pb-4">
                <TabButton
                    label="Queue"
                    active={currentTab === "queue"}
                    onClick={() => setCurrentTab("queue")}
                />
                <TabButton
                    label="Related"
                    active={currentTab === "recommended"}
                    onClick={() => setCurrentTab("recommended")}
                />
            </div>

            {/* Scrollable content */}
            <div
                className="relative flex-1 overflow-auto scroll-smooth pt-3 pb-7"
                ref={queueDivRef}
                onScroll={(e) => setQueueScroll(e.currentTarget.scrollTop)}
            >
                {currentTab === "queue" ? (
                    <PlayerUIQueueList
                        queue={queue}
                        queueScroll={queueScroll}
                        queueDivRef={queueDivRef}
                        lang={lang}
                    />
                ) : (
                    <PlayerUIRelatedTab />
                )}
            </div>
        </div>
    );
}

function TabButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            className={`text-lg font-semibold transition ${
                active
                    ? "border-b-2 border-white text-white"
                    : "text-gray-400 md:hover:text-white"
            }`}
            onClick={onClick}
        >
            {label}
        </button>
    );
}
