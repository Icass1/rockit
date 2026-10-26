"use client";

import { useEffect, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { Headphones, Music2, Send, Users } from "lucide-react";
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
    const [ready, setReady] = useState(false);
    const onlineCount = friends.filter((friend) => friend.isOnline).length;
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
                    <p className={styles.subtitle}>{v.FRIENDS_SOCIAL_INTRO}</p>
                </div>
            </header>
            <nav className={styles.navigation} aria-label={v.FRIENDS}>
                {[
                    {
                        id: "social-circle",
                        label: v.SOCIAL_PEOPLE,
                        icon: Users,
                    },
                    {
                        id: "social-shared",
                        label: v.FRIENDS_NAV_SHARED,
                        icon: Send,
                    },
                    {
                        id: "social-recent",
                        label: v.FRIENDS_NAV_RECENT,
                        icon: Music2,
                    },
                    {
                        id: "social-together",
                        label: v.FRIENDS_PARTY,
                        icon: Headphones,
                    },
                ].map(({ id, label, icon: Icon }) => (
                    <a key={id} href={`#${id}`}>
                        <Icon size={17} aria-hidden="true" />
                        <span>{label}</span>
                    </a>
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
            <div className={styles.socialLayout}>
                <section
                    id="social-circle"
                    className={styles.peopleRegion}
                    aria-labelledby="social-people"
                >
                    <div className={styles.directoryHeading}>
                        <h2 id="social-people" className={styles.sectionTitle}>
                            {v.SOCIAL_PEOPLE}
                        </h2>
                        <span className={styles.presence} role="status">
                            {v.FRIENDS_ONLINE_COUNT.replace(
                                "{count}",
                                String(onlineCount)
                            )}
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
                </section>
                <div className={styles.musicRegion}>
                    <section
                        id="social-shared"
                        className={styles.sharedRegion}
                        aria-labelledby="social-shared-title"
                    >
                        <h2
                            id="social-shared-title"
                            className={styles.sectionTitle}
                        >
                            {v.FRIENDS_SHARED_MUSIC}
                        </h2>
                        <SharedMediaInbox />
                    </section>
                    <section
                        id="social-recent"
                        className={styles.recentRegion}
                        aria-labelledby="social-recent-title"
                    >
                        <h2
                            id="social-recent-title"
                            className={styles.sectionTitle}
                        >
                            {v.FRIENDS_RECENT_LISTENS}
                        </h2>
                        {!ready && activity.length === 0 ? (
                            <div
                                className={styles.directorySkeleton}
                                aria-busy="true"
                                aria-label={v.SEARCH_LOADING}
                            >
                                <div />
                                <div />
                            </div>
                        ) : (
                            <FriendActivityFeed activities={activity} />
                        )}
                    </section>
                </div>
                <section
                    id="social-together"
                    className={styles.togetherRegion}
                    aria-label={v.FRIENDS_PARTY}
                >
                    <ListenTogetherPanel compact />
                </section>
                <aside
                    className={styles.progressRegion}
                    aria-label={v.FRIENDS_PERSONAL_PROGRESS}
                >
                    <FriendLeaderboard />
                </aside>
            </div>
        </div>
    );
}
