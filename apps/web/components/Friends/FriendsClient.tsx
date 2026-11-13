"use client";

import { type JSX } from "react";
import { useStore } from "@nanostores/react";
import { ListeningCircle } from "@rockit/ui";
import { Headphones, Music2, Send, Users } from "lucide-react";
import FriendActivityFeed from "@/components/Friends/FriendActivityFeed";
import FriendLeaderboard from "@/components/Friends/FriendLeaderboard";
import FriendRequests from "@/components/Friends/FriendRequests";
import styles from "@/components/Friends/Friends.module.css";
import FriendsList from "@/components/Friends/FriendsList";
import ListenTogetherPanel from "@/components/Friends/ListenTogetherPanel";
import SharedMediaInbox from "@/components/Friends/SharedMediaInbox";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function FriendsClient(): JSX.Element {
    const { friendManager } = useRuntimeServices();
    const scope = useStore(friendManager.scopeAtom);
    return <FriendsContent key={scope} />;
}

function FriendsContent(): JSX.Element {
    const {
        friendManager,
        sharingManager,
        listenTogetherManager,
        userManager,
    } = useRuntimeServices();
    const self = useStore(userManager.sessionAtom);
    const inviting = useStore(listenTogetherManager.loadingAtom);
    const v = useVocabulary();
    const friends = useStore(friendManager.friendsAtom);
    const activity = useStore(friendManager.activityAtom);
    const error = useStore(friendManager.errorAtom);
    const loading = useStore(friendManager.loadingAtom);
    const requests = useStore(friendManager.incomingRequestsAtom);
    const loadingShares = useStore(sharingManager.loadingAtom);
    const onlineCount = friends.filter((friend) => friend.isOnline).length;
    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{v.FRIENDS}</h1>
                    <p className={styles.subtitle}>{v.FRIENDS_SOCIAL_INTRO}</p>
                </div>
                <div>
                    <p
                        className="text-muted-foreground mt-2 flex items-center gap-2 text-sm"
                        role="status"
                    >
                        <span
                            className="bg-success h-2 w-2 rounded-full"
                            aria-hidden
                        />
                        {onlineCount} {v.FRIENDS_ONLINE}
                    </p>
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
            {((!loading && !error) || friends.length > 0) && (
                <ListeningCircle
                    friends={friends}
                    self={self ?? undefined}
                    vocabulary={v}
                    busy={inviting}
                    onInvite={(publicId) => {
                        void listenTogetherManager
                            .invite(publicId)
                            .then((ok) => {
                                if (ok)
                                    document
                                        .getElementById("social-together")
                                        ?.scrollIntoView({
                                            behavior: window.matchMedia(
                                                "(prefers-reduced-motion: reduce)"
                                            ).matches
                                                ? "auto"
                                                : "smooth",
                                            block: "start",
                                        });
                            });
                    }}
                    onFindFriends={() => {
                        const input = document.querySelector<HTMLInputElement>(
                            "#social-circle input"
                        );
                        input?.scrollIntoView({ block: "center" });
                        input?.focus();
                    }}
                />
            )}
            {error && (
                <div className={styles.error} role="alert">
                    <p>{error}</p>
                    <button
                        onClick={() => {
                            void friendManager.fetchFriends();
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
                    {loadingShares && activity.length === 0 ? (
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
