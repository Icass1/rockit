"use client";

import { useEffect, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import {
    ArrowDown,
    ChevronDown,
    Headphones,
    Music2,
    Send,
    Users,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import FriendActivityFeed from "@/components/Friends/FriendActivityFeed";
import FriendLeaderboard from "@/components/Friends/FriendLeaderboard";
import FriendRequests from "@/components/Friends/FriendRequests";
import styles from "@/components/Friends/Friends.module.css";
import FriendsList from "@/components/Friends/FriendsList";
import ListenTogetherPanel from "@/components/Friends/ListenTogetherPanel";
import SharedMediaInbox from "@/components/Friends/SharedMediaInbox";

export default function FriendsClient(): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const friends = useStore(rockIt.friendManager.friendsAtom);
    const activity = useStore(rockIt.friendManager.activityAtom);
    const error = useStore(rockIt.friendManager.errorAtom);
    const loading = useStore(rockIt.friendManager.loadingAtom);
    const requests = useStore(rockIt.friendManager.incomingRequestsAtom);
    const inbox = useStore(rockIt.sharingManager.inboxAtom);
    const [view, setView] = useState("activity");
    const [ranking, setRanking] = useState(false);
    const [ready, setReady] = useState(false);
    const onlineCount = friends.filter((friend) => friend.isOnline).length;
    const unread = inbox.filter((item) => !item.seen).length;

    useEffect(() => {
        let current = true;
        void Promise.allSettled([
            rockIt.friendManager.fetchFriends(),
            rockIt.friendManager.fetchActivity(),
            rockIt.friendManager.fetchRequests(),
            rockIt.sharingManager.fetchInbox(),
            rockIt.sharingManager.fetchSent(),
            rockIt.listenTogetherManager.fetchSessions(),
        ]).then(() => {
            if (current) setReady(true);
        });
        return () => {
            current = false;
        };
    }, []);

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{v.FRIENDS}</h1>
                    <p className={styles.subtitle}>{v.SOCIAL_INTRO}</p>
                </div>
                <a className={styles.circleLink} href="#social-circle">
                    <Users size={18} aria-hidden="true" />
                    {v.SOCIAL_PEOPLE} <ArrowDown size={16} aria-hidden="true" />
                </a>
            </header>
            <nav className={styles.navigation} aria-label={v.FRIENDS}>
                {[
                    { id: "activity", label: v.SOCIAL_DISCOVER, icon: Music2 },
                    {
                        id: "together",
                        label: v.FRIENDS_PARTY,
                        icon: Headphones,
                    },
                    { id: "shared", label: v.FRIENDS_SHARE, icon: Send },
                ].map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        aria-pressed={view === id}
                        onClick={() => setView(id)}
                    >
                        <Icon size={17} aria-hidden="true" />
                        <span>{label}</span>
                        {id === "shared" && unread > 0 && (
                            <span className={styles.count}>{unread}</span>
                        )}
                    </button>
                ))}
            </nav>
            {error && (
                <div className={styles.error} role="alert">
                    <p>{error}</p>
                    <button
                        onClick={() => {
                            void rockIt.friendManager.fetchFriends();
                        }}
                    >
                        {v.SOCIAL_RETRY}
                    </button>
                </div>
            )}
            {requests.length > 0 && <FriendRequests />}
            <div className={styles.dashboardGrid}>
                <section
                    className={styles.activitySection}
                    aria-label={
                        view === "activity"
                            ? v.SOCIAL_DISCOVER
                            : view === "together"
                              ? v.FRIENDS_PARTY
                              : v.FRIENDS_SHARE
                    }
                >
                    {view === "activity" &&
                        (!ready && activity.length === 0 ? (
                            <div
                                className={styles.activitySkeleton}
                                aria-busy="true"
                                aria-label={v.SEARCH_LOADING}
                            >
                                <div />
                                <div />
                            </div>
                        ) : (
                            <FriendActivityFeed activities={activity} />
                        ))}
                    {view === "together" && <ListenTogetherPanel />}
                    {view === "shared" && <SharedMediaInbox />}
                </section>
                <aside
                    id="social-circle"
                    className={styles.circleSection}
                    aria-labelledby="social-people"
                >
                    <div className={styles.directoryHeading}>
                        <h2 id="social-people" className={styles.sectionTitle}>
                            {v.SOCIAL_PEOPLE}
                        </h2>
                        <span className={styles.presence} role="status">
                            {onlineCount} {v.FRIENDS_ONLINE}
                        </span>
                    </div>
                    {loading && friends.length === 0 ? (
                        <div
                            className={styles.directorySkeleton}
                            aria-busy="true"
                            aria-label={v.SEARCH_LOADING}
                        >
                            <div />
                            <div />
                            <div />
                        </div>
                    ) : (
                        <FriendsList friends={friends} />
                    )}
                </aside>
            </div>
            <section className={styles.rankingSection}>
                <button
                    className={styles.rankingToggle}
                    aria-expanded={ranking}
                    aria-controls="social-rankings"
                    onClick={() => setRanking(!ranking)}
                >
                    <span>
                        {v.SOCIAL_RACE}
                        <small>{v.SOCIAL_PASSPORT}</small>
                    </span>
                    <ChevronDown
                        size={20}
                        aria-hidden="true"
                        style={{
                            transform: ranking ? "rotate(180deg)" : undefined,
                        }}
                    />
                </button>
                <div id="social-rankings" hidden={!ranking}>
                    {ranking && <FriendLeaderboard />}
                </div>
            </section>
        </div>
    );
}
