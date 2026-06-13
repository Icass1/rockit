"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import FriendActivityFeed from "./FriendActivityFeed";
import FriendsList from "./FriendsList";
import FriendRequests from "./FriendRequests";
import SharedMediaInbox from "./SharedMediaInbox";
import ListenTogetherPanel from "./ListenTogetherPanel";
import FriendLeaderboard from "./FriendLeaderboard";
import LivePulseBanner from "./LivePulseBanner";

type Tab = "activity" | "friends" | "share" | "party" | "ranks";

const TABS: { id: Tab; label: string }[] = [
    { id: "activity", label: "Activity" },
    { id: "friends", label: "Friends" },
    { id: "share", label: "Share" },
    { id: "party", label: "Party" },
    { id: "ranks", label: "Ranks" },
];

export default function FriendsClient(): JSX.Element {
    const [activeTab, setActiveTab] = useState<Tab>("activity");
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [indicator, setIndicator] = useState({ left: 0, width: 0 });

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $friends = useStore(rockIt.friendManager.friendsAtom);
    const $activity = useStore(rockIt.friendManager.activityAtom);
    const $loading = useStore(rockIt.friendManager.loadingAtom);
    const $requests = useStore(rockIt.friendManager.incomingRequestsAtom);

    useEffect(() => {
        rockIt.friendManager.fetchFriends();
        rockIt.friendManager.fetchActivity();
        rockIt.friendManager.fetchRequests();
        rockIt.sharingManager.fetchInbox();
        rockIt.sharingManager.fetchSent();
        rockIt.listenTogetherManager.fetchSessions();
    }, []);

    useEffect(() => {
        const idx = TABS.findIndex((t) => t.id === activeTab);
        const el = tabRefs.current[idx];
        if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }, [activeTab]);

    const onlineCount = $friends.filter((f) => f.isOnline).length;

    return (
        <div className="mx-auto w-full overflow-x-hidden px-4 pt-6 pb-24 sm:max-w-lg md:max-w-3xl md:px-8 md:pt-10 lg:max-w-5xl xl:max-w-7xl 2xl:max-w-[1600px]">

            <div
                className="animate-fade-in-up mb-8 md:mb-10"
                style={{ animationDelay: "0ms" }}
            >
                <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                    {$vocabulary.FRIENDS ?? "Friends"}
                </h1>
                <p className="mt-1.5 text-sm text-neutral-500 md:text-base">
                    {onlineCount > 0
                        ? `${onlineCount} friend${onlineCount !== 1 ? "s" : ""} listening right now`
                        : "See what your world is listening to"}
                </p>
            </div>

            <div
                className="animate-fade-in-up mb-6"
                style={{ animationDelay: "50ms" }}
            >
                <div className="relative flex overflow-x-auto border-b border-white/[0.06] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {TABS.map((tab, i) => (
                        <button
                            key={tab.id}
                            ref={(el) => { tabRefs.current[i] = el; }}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                                activeTab === tab.id
                                    ? "text-white"
                                    : "text-neutral-600 hover:text-neutral-400"
                            }`}
                        >
                            {tab.label}
                            {tab.id === "friends" && $requests.length > 0 && (
                                <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ee1086] px-1 text-[10px] font-bold text-white">
                                    {$requests.length}
                                </span>
                            )}
                        </button>
                    ))}
                    <span
                        aria-hidden
                        className="pointer-events-none absolute bottom-0 h-px rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] transition-all duration-200 ease-out"
                        style={{ left: indicator.left, width: indicator.width }}
                    />
                </div>
            </div>

            <div
                className="animate-fade-in-up"
                style={{ animationDelay: "100ms" }}
            >
                {$loading ? (
                    <div className="flex flex-col gap-3">
                        <div className="skeleton h-20 w-full rounded-2xl" />
                        <div className="skeleton h-32 w-full rounded-2xl" />
                        <div className="skeleton h-32 w-full rounded-2xl" />
                    </div>
                ) : (
                    <>
                        {activeTab === "activity" && (
                            <div className="flex flex-col gap-5">
                                <LivePulseBanner friends={$friends} />
                                <FriendActivityFeed activities={$activity} />
                            </div>
                        )}
                        {activeTab === "friends" && (
                            <div className="flex flex-col gap-4">
                                <FriendRequests />
                                <FriendsList friends={$friends} />
                            </div>
                        )}
                        {activeTab === "share" && <SharedMediaInbox />}
                        {activeTab === "party" && <ListenTogetherPanel />}
                        {activeTab === "ranks" && <FriendLeaderboard />}
                    </>
                )}
            </div>
        </div>
    );
}
