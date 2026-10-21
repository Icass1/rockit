"use client";

import { useEffect, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { ArrowUpRight } from "lucide-react";
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
    const requests = useStore(rockIt.friendManager.incomingRequestsAtom);

    useEffect(() => {
        void rockIt.friendManager.fetchFriends();
        void rockIt.friendManager.fetchActivity();
        void rockIt.friendManager.fetchRequests();
        void rockIt.sharingManager.fetchInbox();
        void rockIt.sharingManager.fetchSent();
        void rockIt.listenTogetherManager.fetchSessions();
    }, []);

    return (
        <div className={styles.root}>
            {error && <p role="alert">{error}</p>}
            <header className={styles.header}>
                <p className={styles.eyebrow}>Rocket · {v.FRIENDS}</p>
                <h1 className={styles.title}>{v.SOCIAL_HEADLINE}</h1>
                <p className={styles.subtitle}>{v.SOCIAL_INTRO}</p>
                <a className={styles.circleLink} href="#social-circle">
                    {v.SOCIAL_PEOPLE} <span>{friends.length}</span>{" "}
                    <ArrowUpRight size={16} aria-hidden="true" />
                </a>
            </header>
            <FriendLeaderboard />
            {requests.length > 0 && <FriendRequests />}
            <div className={styles.dashboardGrid}>
                <section
                    className={styles.activitySection}
                    aria-labelledby="social-activity"
                >
                    <h2 id="social-activity" className={styles.sectionTitle}>
                        {v.SOCIAL_DISCOVER}
                    </h2>
                    <FriendActivityFeed activities={activity} />
                </section>
                <aside className={styles.socialRail}>
                    <section aria-label={v.FRIENDS_PARTY}>
                        <h2 className={styles.sectionTitle}>
                            {v.FRIENDS_PARTY}
                        </h2>
                        <ListenTogetherPanel />
                    </section>
                    <section aria-label={v.FRIENDS_SHARE}>
                        <h2 className={styles.sectionTitle}>
                            {v.FRIENDS_SHARE}
                        </h2>
                        <SharedMediaInbox />
                    </section>
                </aside>
            </div>
            <section
                id="social-circle"
                className={styles.circleSection}
                aria-labelledby="social-people"
            >
                <h2 id="social-people" className={styles.sectionTitle}>
                    {v.SOCIAL_MANAGE}
                </h2>
                <FriendsList friends={friends} />
            </section>
        </div>
    );
}
