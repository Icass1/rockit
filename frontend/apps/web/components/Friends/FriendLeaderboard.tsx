"use client";

import { useEffect, useState, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { ArrowUpRight, ChevronDown, Flame, Headphones } from "lucide-react";
import type { LeaderboardEntry } from "@/models/interfaces";
import { rockIt } from "@/lib/rockit/rockIt";
import EmblemCollection from "@/components/Friends/EmblemCollection";
import styles from "@/components/Friends/Friends.module.css";

export default function FriendLeaderboard(): JSX.Element {
    const v = useStore(
        rockIt.vocabularyManager.vocabularyAtom
    ) as unknown as Record<string, string>;
    const friends = useStore(rockIt.friendManager.friendsAtom);
    const activity = useStore(rockIt.friendManager.activityAtom);
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [self, setSelf] = useState<LeaderboardEntry | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [retry, setRetry] = useState(0);
    const text = (
        key: string,
        values: Record<string, string | number> = {}
    ): string =>
        Object.entries(values).reduce(
            (s, [k, value]) => s.replace(`{${k}}`, String(value)),
            v[key] || key
        );

    useEffect(() => {
        let live = true;
        void rockIt.friendManager
            .fetchLeaderboard()
            .then((data) => {
                if (!live) return;
                setEntries(data.entries);
                setSelf(data.currentUser);
                setFailed(false);
            })
            .catch(() => {
                if (live) setFailed(true);
            })
            .finally(() => {
                if (live) setLoading(false);
            });
        return () => {
            live = false;
        };
    }, [friends, activity, retry]);

    if (loading)
        return <div className="skeleton h-72 rounded-3xl" aria-busy="true" />;
    if (failed)
        return (
            <div className={styles.league} role="alert">
                <p>{v.SOCIAL_ERROR}</p>
                <button onClick={() => setRetry((n) => n + 1)}>
                    {v.SOCIAL_RETRY}{" "}
                    <ArrowUpRight size={16} aria-hidden="true" />
                </button>
            </div>
        );
    const sorted = [
        ...entries.filter((e) => e.userId !== self?.userId),
        ...(self ? [self] : []),
    ].sort((a, b) => b.xp - a.xp || a.username.localeCompare(b.username));
    const others = sorted.filter((e) => e.userId !== self?.userId);
    const selected = others.find((e) => e.userId === selectedId) || others[0];
    const progress = self
        ? self.xpToNext > 0
            ? Math.max(
                  0,
                  Math.min(
                      100,
                      (100 * (self.xp - self.levelStartXp)) /
                          (self.xp + self.xpToNext - self.levelStartXp)
                  )
              )
            : 100
        : 0;
    const commonBadges = (self?.listeningBadges ?? []).filter(
        (badge) =>
            badge.earnedAt &&
            selected?.listeningBadges?.some(
                (other) => other.key === badge.key && other.earnedAt
            )
    ).length;
    const sessionSeconds = self?.sessionListeningSeconds ?? 0;
    const milestones = self?.listeningMilestones ?? [];
    const nextMilestone = milestones.find((step) => !step.reached);
    const sessionLabel = nextMilestone
        ? text("FRIENDS_SESSION_MINUTES", {
              minutes: Math.floor(sessionSeconds / 60),
              target: nextMilestone.minutes,
          })
        : text("FRIENDS_LISTENED_MINUTES", {
              minutes: Math.floor(sessionSeconds / 60),
          });
    const avatar = (entry: LeaderboardEntry): JSX.Element => (
        <span className={styles.leagueAvatar}>
            {entry.imageUrl ? (
                <Image src={entry.imageUrl} alt="" width={40} height={40} />
            ) : (
                entry.username[0]?.toUpperCase()
            )}
        </span>
    );

    return (
        <div className={styles.competition}>
            {self && (
                <section
                    className={styles.passport}
                    aria-labelledby="music-identity"
                >
                    <h2 id="music-identity" className={styles.sectionTitle}>
                        {v.FRIENDS_PERSONAL_PROGRESS}
                    </h2>
                    <div className={styles.identity}>
                        <span className={styles.levelLabel}>
                            {text("SOCIAL_LEVEL", { level: self.level })}
                        </span>
                        <div className={styles.identityName}>
                            <h3>{self.username}</h3>
                            <p>{v[self.title] || self.title}</p>
                            <span>
                                {text("SOCIAL_XP_TOTAL", {
                                    xp: self.xp.toLocaleString(),
                                })}
                            </span>
                        </div>
                    </div>
                    <div className={styles.progressCopy}>
                        {self.xpToNext > 0
                            ? text("SOCIAL_NEXT", {
                                  xp: self.xpToNext.toLocaleString(),
                              })
                            : v.SOCIAL_MAX}
                    </div>
                    <progress
                        className={styles.levelProgress}
                        value={progress}
                        max={100}
                        aria-label={text("SOCIAL_LEVEL", { level: self.level })}
                    />
                    <div className={styles.personalStats}>
                        <div>
                            <Headphones size={18} />
                            <strong>
                                {self.songsListened.toLocaleString()}
                            </strong>
                            <span>{v.SOCIAL_LISTENS}</span>
                        </div>
                        <div>
                            <Flame size={18} />
                            <strong>{self.streak}</strong>
                            <span>{v.SOCIAL_STREAK}</span>
                        </div>
                    </div>
                    <p className={styles.statFootnote}>
                        {v.FRIENDS_XP_TIME_RULE}
                    </p>
                    {milestones.length > 0 && (
                        <section
                            className={styles.sessionProgress}
                            aria-label={v.FRIENDS_SESSION_PROGRESS}
                        >
                            <h3>{v.FRIENDS_SESSION_PROGRESS}</h3>
                            <p>{sessionLabel}</p>
                            <progress
                                className={styles.levelProgress}
                                value={sessionSeconds}
                                max={(nextMilestone?.minutes ?? 60) * 60}
                                aria-label={sessionLabel}
                            />
                            <details className={styles.sessionDetails}>
                                <summary>
                                    {v.FRIENDS_SESSION_MILESTONES}
                                </summary>
                                <ul>
                                    {milestones.map((step) => (
                                        <li
                                            key={step.minutes}
                                            data-reached={step.reached}
                                        >
                                            <span>
                                                {text("FRIENDS_XP_MILESTONE", {
                                                    minutes: step.minutes,
                                                    xp: step.xp,
                                                })}
                                            </span>
                                            <span>
                                                {step.reached
                                                    ? v.FRIENDS_MILESTONE_REACHED
                                                    : v.FRIENDS_MILESTONE_PENDING}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <p className={styles.statFootnote}>
                                    {v.FRIENDS_SESSION_RULE}
                                </p>
                            </details>
                        </section>
                    )}
                    {self.listeningBadges && (
                        <section
                            className={styles.personalEmblems}
                            aria-label={v.FRIENDS_BADGES}
                        >
                            <h3>{v.FRIENDS_BADGES}</h3>
                            <EmblemCollection badges={self.listeningBadges} />
                        </section>
                    )}
                </section>
            )}
            <details className={styles.leagueDisclosure}>
                <summary>
                    {v.FRIENDS_COMPARE_PROGRESS}
                    <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <p className={styles.statFootnote}>
                    {others.length ? v.SOCIAL_COMPARE : v.SOCIAL_EMPTY}
                </p>
                <ol className={styles.rankings}>
                    {sorted.map((entry) => {
                        const rank =
                            sorted.findIndex((e) => e.xp === entry.xp) + 1;
                        const isSelf = entry.userId === self?.userId;
                        return (
                            <li key={entry.userId}>
                                <button
                                    className={styles.rankRow}
                                    aria-pressed={
                                        !isSelf &&
                                        selected?.userId === entry.userId
                                    }
                                    disabled={isSelf}
                                    data-self={isSelf}
                                    onClick={() => setSelectedId(entry.userId)}
                                >
                                    <span className={styles.rankNumber}>
                                        {String(rank).padStart(2, "0")}
                                    </span>
                                    {avatar(entry)}
                                    <span className={styles.rankName}>
                                        <strong>
                                            {isSelf
                                                ? v.SOCIAL_YOU
                                                : entry.username}
                                        </strong>
                                        <small>
                                            {text("SOCIAL_LEVEL", {
                                                level: entry.level,
                                            })}{" "}
                                            ·{" "}
                                            {entry.songsListened.toLocaleString()}{" "}
                                            {v.SOCIAL_LISTENS?.toLowerCase()}
                                        </small>
                                    </span>
                                    <span className={styles.rankXp}>
                                        {entry.xp.toLocaleString()}
                                        <small>{v.SOCIAL_XP}</small>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>
                {selected && self && (
                    <div key={selected.userId} className={styles.comparison}>
                        <p>
                            {selected.xp > self.xp
                                ? text("SOCIAL_GAP", {
                                      xp: (
                                          selected.xp - self.xp
                                      ).toLocaleString(),
                                      name: selected.username,
                                  })
                                : selected.xp === self.xp
                                  ? v.SOCIAL_TIED
                                  : v.SOCIAL_LEAD}
                        </p>
                        <table className={styles.comparisonTable}>
                            <caption className="sr-only">
                                {v.SOCIAL_COMPARE}
                            </caption>
                            <thead>
                                <tr>
                                    <th scope="col">{v.FRIENDS_STATS}</th>
                                    <th scope="col">{v.SOCIAL_YOU}</th>
                                    <th scope="col">{selected.username}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    [
                                        v.SOCIAL_LISTENS,
                                        self.songsListened,
                                        selected.songsListened,
                                    ],
                                    [
                                        v.SOCIAL_STREAK,
                                        self.streak,
                                        selected.streak,
                                    ],
                                    [
                                        v.FRIENDS_LISTENING_MINUTES,
                                        Math.floor(
                                            (self.totalListeningSeconds ?? 0) /
                                                60
                                        ),
                                        Math.floor(
                                            (selected.totalListeningSeconds ??
                                                0) / 60
                                        ),
                                    ],
                                ].map(([label, a, b]) => (
                                    <tr key={label}>
                                        <th scope="row">{label}</th>
                                        <td>{Number(a).toLocaleString()}</td>
                                        <td>{Number(b).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <section
                            className={styles.emblemComparison}
                            aria-label={v.FRIENDS_BADGE_COMPARE}
                        >
                            <h3>{v.FRIENDS_BADGE_COMPARE}</h3>
                            <p className={styles.statFootnote}>
                                {text("FRIENDS_BADGE_COMMON", {
                                    count: commonBadges,
                                })}
                            </p>
                            <div>
                                <section aria-label={v.SOCIAL_YOU}>
                                    <h4>{v.SOCIAL_YOU}</h4>
                                    <EmblemCollection
                                        badges={self.listeningBadges ?? []}
                                        compact
                                    />
                                </section>
                                <section aria-label={selected.username}>
                                    <h4>{selected.username}</h4>
                                    <EmblemCollection
                                        badges={selected.listeningBadges ?? []}
                                        compact
                                    />
                                </section>
                            </div>
                        </section>
                    </div>
                )}
                {!others.length && (
                    <a className={styles.circleLink} href="#social-circle">
                        {v.SOCIAL_MANAGE}{" "}
                        <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                )}
            </details>
        </div>
    );
}
