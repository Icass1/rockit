"use client";

import { useEffect, useState, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { ArrowUpRight, Flame, Headphones } from "lucide-react";
import type { LeaderboardEntry } from "@/models/interfaces";
import { rockIt } from "@/lib/rockit/rockIt";
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
                    <p id="music-identity" className={styles.eyebrow}>
                        {v.SOCIAL_PASSPORT}
                    </p>
                    <div className={styles.identity}>
                        <div className={styles.levelDisc}>
                            <svg viewBox="0 0 120 120" aria-hidden="true">
                                <circle cx="60" cy="60" r="54" />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="54"
                                    pathLength="100"
                                    strokeDasharray={`${progress} 100`}
                                />
                            </svg>
                            <span>
                                <small>
                                    {v.SOCIAL_LEVEL?.replace("{level}", "")}
                                </small>
                                <strong>{self.level}</strong>
                            </span>
                        </div>
                        <div className={styles.identityName}>
                            <h2>{self.username}</h2>
                            <p>{v[self.title] || self.title}</p>
                            <span>{self.xp.toLocaleString()} XP</span>
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
                    <p className={styles.statFootnote}>{v.SOCIAL_XP_RULE}</p>
                </section>
            )}
            <section
                className={styles.league}
                aria-labelledby="listening-league"
            >
                <div className={styles.leagueHeading}>
                    <div>
                        <p className={styles.eyebrow}>Rocket · XP</p>
                        <h2 id="listening-league">{v.SOCIAL_RACE}</h2>
                    </div>
                    <ArrowUpRight aria-hidden="true" />
                </div>
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
                                        <small>XP</small>
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
                        <div className={styles.compareNames}>
                            <span>{v.SOCIAL_YOU}</span>
                            <span>{selected.username}</span>
                        </div>
                        <dl>
                            {[
                                [
                                    v.SOCIAL_LISTENS,
                                    self.songsListened,
                                    selected.songsListened,
                                ],
                                [v.SOCIAL_STREAK, self.streak, selected.streak],
                            ].map(([label, a, b]) => (
                                <div key={label}>
                                    <dd>{Number(a).toLocaleString()}</dd>
                                    <dt>{label}</dt>
                                    <dd>{Number(b).toLocaleString()}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
                {!others.length && (
                    <a className={styles.circleLink} href="#social-circle">
                        {v.SOCIAL_MANAGE}{" "}
                        <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                )}
            </section>
        </div>
    );
}
