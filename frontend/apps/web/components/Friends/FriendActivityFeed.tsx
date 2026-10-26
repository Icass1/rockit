"use client";

import { useState, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { Heart, ListPlus, Music2, Play, Share2 } from "lucide-react";
import type { FriendActivity } from "@/models/interfaces";
import { rockIt } from "@/lib/rockit/rockIt";
import styles from "@/components/Friends/Friends.module.css";

function timeAgo(date: string, now: string, units: string[]): string {
    const minutes = Math.max(
        0,
        Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    );
    if (!Number.isFinite(minutes) || minutes < 1) return now;
    const index = minutes < 60 ? 0 : minutes < 1440 ? 1 : 2;
    const count =
        index === 0
            ? minutes
            : index === 1
              ? Math.floor(minutes / 60)
              : Math.floor(minutes / 1440);
    return units[index].replace("{count}", String(count));
}

function ActivitySleeve({
    item,
    featured = false,
}: {
    item: FriendActivity;
    featured?: boolean;
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [busy, setBusy] = useState(false);
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
    const play = async (): Promise<void> => {
        setBusy(true);
        try {
            await rockIt.sharingManager.playSharedMedia(item.mediaPublicId);
        } finally {
            setBusy(false);
        }
    };
    return (
        <article
            className={featured ? styles.featuredListen : styles.listenRow}
        >
            <div className={styles.sleeve}>
                {item.mediaImageUrl && failedImage !== item.mediaImageUrl ? (
                    <Image
                        src={item.mediaImageUrl}
                        alt=""
                        width={featured ? 640 : 104}
                        height={featured ? 640 : 104}
                        className={styles.sleeveImage}
                        onError={() => setFailedImage(item.mediaImageUrl)}
                    />
                ) : (
                    <Music2
                        size={featured ? 72 : 28}
                        strokeWidth={1}
                        aria-hidden="true"
                    />
                )}
                <button
                    className={styles.sleevePlay}
                    disabled={busy}
                    aria-label={`${v.PLAY}: ${item.mediaName}`}
                    onClick={() => {
                        void play();
                    }}
                >
                    <Play
                        size={featured ? 24 : 18}
                        fill="currentColor"
                        aria-hidden="true"
                    />
                </button>
            </div>
            <div className={styles.listenCopy}>
                <div className={styles.attribution}>
                    <span className={styles.listenerAvatar} aria-hidden="true">
                        {item.userImageUrl &&
                        failedAvatar !== item.userImageUrl ? (
                            <Image
                                src={item.userImageUrl}
                                alt=""
                                width={24}
                                height={24}
                                onError={() =>
                                    setFailedAvatar(item.userImageUrl)
                                }
                            />
                        ) : (
                            item.username.slice(0, 1).toUpperCase()
                        )}
                    </span>
                    <span>{item.username}</span>
                    <time dateTime={item.listenedAt}>
                        {timeAgo(item.listenedAt, v.JUST_NOW, [
                            v.SOCIAL_MINUTES_AGO,
                            v.SOCIAL_HOURS_AGO,
                            v.SOCIAL_DAYS_AGO,
                        ])}
                    </time>
                </div>
                <h3 className={styles.trackTitle}>{item.mediaName}</h3>
                <div className={styles.trackActions}>
                    {[
                        {
                            icon: Heart,
                            label: v.LIKE,
                            action: () =>
                                rockIt.mediaManager.toggleLikeMedia(
                                    item.mediaPublicId
                                ),
                        },
                        {
                            icon: ListPlus,
                            label: v.ADD_TO_QUEUE,
                            action: () =>
                                rockIt.sharingManager.queueSharedMedia(
                                    item.mediaPublicId
                                ),
                        },
                        {
                            icon: Share2,
                            label: v.FRIENDS_SHARE,
                            action: () =>
                                rockIt.sharingManager.compose(
                                    item.mediaPublicId
                                ),
                        },
                    ].map(({ icon: Icon, label, action }) => (
                        <button
                            key={label}
                            aria-label={`${label}: ${item.mediaName}`}
                            title={label}
                            onClick={() => {
                                void action();
                            }}
                        >
                            <Icon size={18} aria-hidden="true" />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </article>
    );
}

export default function FriendActivityFeed({
    activities,
}: {
    activities: FriendActivity[];
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    if (activities.length === 0)
        return (
            <div className={styles.activityEmpty}>
                <Music2 size={40} strokeWidth={1.25} aria-hidden="true" />
                <h2>{v.NOTHING_PLAYING_YET}</h2>
                <p>{v.FRIENDS_ACTIVITY_WILL_APPEAR}</p>
                <a className={styles.circleLink} href="#social-circle">
                    {v.SOCIAL_MANAGE}
                </a>
            </div>
        );
    return (
        <div className={styles.activityFeed}>
            <h2 className={styles.sectionTitle}>{v.SOCIAL_DISCOVER}</h2>
            <ActivitySleeve
                key={`${activities[0].userPublicId}-${activities[0].mediaPublicId}`}
                item={activities[0]}
                featured
            />
            {activities.length > 1 && (
                <section className={styles.recentList} aria-label={v.RECENT}>
                    <h2 className={styles.sectionTitle}>{v.RECENT}</h2>
                    {activities.slice(1).map((item, i) => (
                        <ActivitySleeve
                            key={`${item.userPublicId}-${item.mediaPublicId}-${i}`}
                            item={item}
                        />
                    ))}
                </section>
            )}
        </div>
    );
}
