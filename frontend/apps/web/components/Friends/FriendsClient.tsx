"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { EFriendTab } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import FriendActivityFeed from "@/components/Friends/FriendActivityFeed";
import FriendLeaderboard from "@/components/Friends/FriendLeaderboard";
import FriendRequests from "@/components/Friends/FriendRequests";
import styles from "@/components/Friends/Friends.module.css";
import FriendsList from "@/components/Friends/FriendsList";
import ListenTogetherPanel from "@/components/Friends/ListenTogetherPanel";
import LivePulseBanner from "@/components/Friends/LivePulseBanner";
import SharedMediaInbox from "@/components/Friends/SharedMediaInbox";

export default function FriendsClient(): JSX.Element {
    const [activeTab, setActiveTab] = useState<EFriendTab>(EFriendTab.ACTIVITY);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const v = $vocabulary as unknown as Record<string, string>;
    const $friends = useStore(rockIt.friendManager.friendsAtom);
    const $activity = useStore(rockIt.friendManager.activityAtom);
    const $loading = useStore(rockIt.friendManager.loadingAtom);
    const error = useStore(rockIt.friendManager.errorAtom);
    const $requests = useStore(rockIt.friendManager.incomingRequestsAtom);

    const tabs = useMemo<{ id: EFriendTab; label: string }[]>(
        () => [
            { id: EFriendTab.ACTIVITY, label: $vocabulary.FRIENDS_ACTIVITY },
            { id: EFriendTab.FRIENDS, label: $vocabulary.FRIENDS_FRIENDS },
            { id: EFriendTab.SHARE, label: $vocabulary.FRIENDS_SHARE },
            { id: EFriendTab.PARTY, label: $vocabulary.FRIENDS_PARTY },
            { id: EFriendTab.RANKS, label: $vocabulary.FRIENDS_RANKS },
        ],
        [$vocabulary]
    );

    useEffect(() => {
        rockIt.friendManager.fetchFriends();
        rockIt.friendManager.fetchActivity();
        rockIt.friendManager.fetchRequests();
        rockIt.sharingManager.fetchInbox();
        rockIt.sharingManager.fetchSent();
        rockIt.listenTogetherManager.fetchSessions();
    }, []);

    useEffect(() => {
        const selected =
            tabRefs.current[tabs.findIndex((tab) => tab.id === activeTab)];
        const container = selected?.parentElement;
        if (!selected || !container) return;
        const reveal = (): void => {
            if (selected.offsetLeft < container.scrollLeft)
                container.scrollLeft = selected.offsetLeft - 6;
            else if (
                selected.offsetLeft + selected.offsetWidth >
                container.scrollLeft + container.clientWidth
            )
                container.scrollLeft =
                    selected.offsetLeft +
                    selected.offsetWidth -
                    container.clientWidth +
                    6;
        };
        reveal();
        const observer = new ResizeObserver(reveal);
        observer.observe(container);
        return () => observer.disconnect();
    }, [activeTab, tabs]);

    const onlineCount = $friends.filter((f) => f.isOnline).length;

    return (
        <div className={styles.root}>
            {error && (
                <p
                    role="alert"
                    className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-400"
                >
                    {error}
                </p>
            )}
            <header className={styles.header}>
                <h1 className={styles.title}>{$vocabulary.FRIENDS}</h1>
                <p className={styles.subtitle}>
                    {onlineCount > 0
                        ? v.FRIENDS_LISTENING_NOW.replace(
                              "{count}",
                              String(onlineCount)
                          )
                        : v.SEE_WHAT_WORLD_LISTENING}
                </p>
            </header>
            <div
                role="tablist"
                aria-label={$vocabulary.FRIENDS}
                className={styles.tabs}
                onKeyDown={(event) => {
                    const index = tabs.findIndex((tab) => tab.id === activeTab);
                    const next =
                        event.key === "ArrowRight"
                            ? (index + 1) % tabs.length
                            : event.key === "ArrowLeft"
                              ? (index + tabs.length - 1) % tabs.length
                              : event.key === "Home"
                                ? 0
                                : event.key === "End"
                                  ? tabs.length - 1
                                  : -1;
                    if (next >= 0) {
                        event.preventDefault();
                        setActiveTab(tabs[next].id);
                        tabRefs.current[next]?.focus();
                    }
                }}
            >
                {tabs.map((tab, i) => (
                    <button
                        key={tab.id}
                        ref={(el) => {
                            tabRefs.current[i] = el;
                        }}
                        onClick={() => setActiveTab(tab.id)}
                        role="tab"
                        id={`friends-tab-${tab.id}`}
                        aria-selected={activeTab === tab.id}
                        aria-controls="friends-panel"
                        tabIndex={activeTab === tab.id ? 0 : -1}
                        className={styles.tab}
                    >
                        {tab.label}
                        {tab.id === EFriendTab.FRIENDS &&
                            $requests.length > 0 && (
                                <span className={styles.badge}>
                                    {$requests.length}
                                </span>
                            )}
                    </button>
                ))}
            </div>
            <div
                id="friends-panel"
                role="tabpanel"
                aria-labelledby={`friends-tab-${activeTab}`}
                tabIndex={0}
                className={styles.panel}
            >
                {$loading && $friends.length === 0 ? (
                    <div className="flex flex-col gap-3">
                        <div className="skeleton h-20 w-full rounded-2xl" />
                        <div className="skeleton h-32 w-full rounded-2xl" />
                        <div className="skeleton h-32 w-full rounded-2xl" />
                    </div>
                ) : (
                    <>
                        {activeTab === EFriendTab.ACTIVITY && (
                            <div className="flex flex-col gap-5">
                                <LivePulseBanner friends={$friends} />
                                <FriendActivityFeed activities={$activity} />
                            </div>
                        )}
                        {activeTab === EFriendTab.FRIENDS && (
                            <div className="flex flex-col gap-4">
                                <FriendRequests />
                                <FriendsList friends={$friends} />
                            </div>
                        )}
                        {activeTab === EFriendTab.SHARE && <SharedMediaInbox />}
                        {activeTab === EFriendTab.PARTY && (
                            <ListenTogetherPanel />
                        )}
                        {activeTab === EFriendTab.RANKS && (
                            <FriendLeaderboard />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
