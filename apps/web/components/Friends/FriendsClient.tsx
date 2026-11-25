"use client";

import { useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { ListeningCircle } from "@rockit/ui";
import { Headphones, Music2, Send, UserPlus, Users } from "lucide-react";
import FriendActivityFeed from "@/components/Friends/FriendActivityFeed";
import FriendLeaderboard from "@/components/Friends/FriendLeaderboard";
import FriendRequests from "@/components/Friends/FriendRequests";
import styles from "@/components/Friends/Friends.module.css";
import FriendsList from "@/components/Friends/FriendsList";
import ListeningProfileDialog from "@/components/Friends/ListeningProfileDialog";
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
    const { friendManager, listenTogetherManager, userManager } =
        useRuntimeServices();
    const self = useStore(userManager.sessionAtom);
    const inviting = useStore(listenTogetherManager.loadingAtom);
    const friends = useStore(friendManager.friendsAtom);
    const activity = useStore(friendManager.activityAtom);
    const error = useStore(friendManager.errorAtom);
    const loading = useStore(friendManager.loadingAtom);
    const requests = useStore(friendManager.incomingRequestsAtom);
    const v = useVocabulary();
    const [profile, setProfile] = useState<{
        publicId?: string;
        name: string;
    } | null>(null);

    const openProfile = (publicId: string): void => {
        const friend = friendManager.friendsAtom
            .get()
            .find((person) => person.publicId === publicId);
        if (friend) setProfile({ publicId, name: friend.username });
    };
    const findFriends = (): void => {
        const input = document.querySelector<HTMLInputElement>(
            "#social-circle input"
        );
        input?.scrollIntoView({ block: "center" });
        input?.focus({ preventScroll: true });
    };
    const invite = async (publicId: string): Promise<void> => {
        const ok = await listenTogetherManager.invite(publicId);
        if (ok)
            document.getElementById("social-together")?.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                    .matches
                    ? "auto"
                    : "smooth",
                block: "start",
            });
    };

    const loadingDirectory = loading && friends.length === 0;
    const showCircle = (!loading && !error) || friends.length > 0;

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <h1 className={styles.title}>{v.FRIENDS}</h1>
                <button
                    type="button"
                    className={styles.findFriends}
                    onClick={findFriends}
                    disabled={loadingDirectory}
                >
                    <UserPlus size={17} aria-hidden />
                    {v.SEARCH_USERS}
                </button>
            </header>
            <nav className={styles.navigation} aria-label={v.FRIENDS}>
                {[
                    {
                        id: "social-listening",
                        label: v.SOCIAL_PEOPLE,
                        icon: Users,
                    },
                    {
                        id: "social-recent",
                        label: v.FRIENDS_NAV_RECENT,
                        icon: Music2,
                    },
                    {
                        id: "social-shared",
                        label: v.FRIENDS_NAV_SHARED,
                        icon: Send,
                    },
                    {
                        id: "social-together",
                        label: v.FRIENDS_PARTY,
                        icon: Headphones,
                    },
                ].map(({ id, label, icon: Icon }) => (
                    <a key={id} href={`#${id}`}>
                        <Icon size={17} aria-hidden />
                        <span>{label}</span>
                    </a>
                ))}
            </nav>
            {error && (
                <div className={styles.error} role="alert">
                    <p>{error}</p>
                    <button onClick={() => void friendManager.fetchFriends()}>
                        {v.SOCIAL_RETRY}
                    </button>
                </div>
            )}
            {requests.length > 0 && <FriendRequests />}
            <div id="social-listening" className={styles.overview}>
                {showCircle && (
                    <div className={styles.circleRegion}>
                        <ListeningCircle
                            presentation="desktop"
                            friends={friends}
                            self={self ?? undefined}
                            vocabulary={v}
                            onViewProfile={openProfile}
                            onViewSelf={() =>
                                setProfile({
                                    name: self?.username ?? v.SOCIAL_YOU,
                                })
                            }
                            busy={inviting}
                            onInvite={(publicId) => void invite(publicId)}
                            onFindFriends={findFriends}
                        />
                    </div>
                )}
                {loadingDirectory && (
                    <div
                        className={`${styles.circleRegion} ${styles.circleSkeleton}`}
                        aria-busy="true"
                        aria-label={v.SEARCH_LOADING}
                    />
                )}
                <section
                    id="social-circle"
                    className={styles.peopleRegion}
                    aria-labelledby="social-people"
                >
                    <h2 id="social-people" className={styles.sectionTitle}>
                        {v.FRIENDS_LIST}
                    </h2>
                    {loadingDirectory ? (
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
                        <FriendsList
                            friends={friends}
                            onViewProfile={openProfile}
                        />
                    )}
                </section>
            </div>
            <div className={styles.moreLayout}>
                <div className={styles.socialColumn}>
                    <section
                        id="social-recent"
                        aria-labelledby="social-recent-title"
                    >
                        <h2
                            id="social-recent-title"
                            className={styles.sectionTitle}
                        >
                            {v.FRIENDS_RECENT_LISTENS}
                        </h2>
                        <FriendActivityFeed activities={activity} />
                    </section>
                    <section
                        id="social-shared"
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
                </div>
                <div className={styles.socialColumn}>
                    <section
                        id="social-together"
                        aria-labelledby="social-together-title"
                    >
                        <h2
                            id="social-together-title"
                            className={styles.sectionTitle}
                        >
                            {v.FRIENDS_PARTY}
                        </h2>
                        <ListenTogetherPanel compact />
                    </section>
                    <aside aria-label={v.FRIENDS_PERSONAL_PROGRESS}>
                        <FriendLeaderboard onViewProfile={openProfile} />
                    </aside>
                </div>
            </div>
            <ListeningProfileDialog
                key={profile ? (profile.publicId ?? "self") : "closed"}
                target={profile}
                onClose={() => setProfile(null)}
            />
        </div>
    );
}
