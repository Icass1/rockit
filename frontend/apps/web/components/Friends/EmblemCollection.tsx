"use client";

import { useId, useState, type JSX } from "react";
import type { ListeningBadgeResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import styles from "@/components/Friends/Friends.module.css";
import RockitEmblem from "@/components/Friends/RockitEmblem";

function searchable(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
}

export default function EmblemCollection({
    badges,
    compact = false,
}: {
    badges: ListeningBadgeResponse[];
    compact?: boolean;
}): JSX.Element {
    const v = useStore(
        rockIt.vocabularyManager.vocabularyAtom
    ) as unknown as Record<string, string>;
    const id = useId();
    const [expanded, setExpanded] = useState(false);
    const [family, setFamily] = useState("all");
    const [status, setStatus] = useState("all");
    const [query, setQuery] = useState("");
    const count = badges.filter((badge) => badge.earnedAt).length;
    const families = [...new Set(badges.map((badge) => badge.scope))];
    const text = (
        key: string,
        values: Record<string, string | number> = {}
    ): string =>
        Object.entries(values).reduce(
            (result, [name, value]) =>
                result.replaceAll(`{${name}}`, String(value)),
            v[key]
        );
    const description = (badge: ListeningBadgeResponse): string =>
        text(badge.descriptionKey, {
            target: badge.target,
            minutes: badge.target,
        });
    const filtered = badges.filter(
        (badge) =>
            (family === "all" || badge.scope === family) &&
            (status === "all" ||
                Boolean(badge.earnedAt) === (status === "earned")) &&
            searchable(`${v[badge.titleKey]} ${description(badge)}`).includes(
                searchable(query.trim())
            )
    );
    const summary = families.flatMap((scope) => {
        const group = badges.filter((badge) => badge.scope === scope);
        const earned = group.filter((badge) => badge.earnedAt);
        const entry = earned.at(-1) ?? group[0];
        return entry ? [entry] : [];
    });
    // A small collection preview keeps personal progress secondary to friends.
    // The full catalogue and every family remain available behind Explore all.
    const preview = [...summary]
        .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""))
        .slice(0, 3);
    const shown = expanded ? filtered : preview;
    return (
        <div
            className={styles.emblemCollection}
            data-compact={compact}
            data-expanded={expanded}
        >
            <p className={styles.statFootnote}>
                {text("FRIENDS_BADGE_COUNT", { count, total: badges.length })}
            </p>
            {expanded && (
                <div className={styles.emblemFilters}>
                    <label htmlFor={`${id}-family`}>
                        {v.FRIENDS_BADGE_FILTER_FAMILY}
                        <select
                            id={`${id}-family`}
                            value={family}
                            onChange={(event) => setFamily(event.target.value)}
                        >
                            <option value="all">{v.FRIENDS_BADGE_ALL}</option>
                            {families.map((scope) => (
                                <option key={scope} value={scope}>
                                    {
                                        v[
                                            `FRIENDS_BADGE_FAMILY_${scope.toUpperCase()}`
                                        ]
                                    }
                                </option>
                            ))}
                        </select>
                    </label>
                    <label htmlFor={`${id}-status`}>
                        {v.FRIENDS_BADGE_FILTER_STATUS}
                        <select
                            id={`${id}-status`}
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            <option value="all">
                                {v.FRIENDS_BADGE_ALL_STATES}
                            </option>
                            <option value="earned">
                                {v.FRIENDS_BADGE_EARNED}
                            </option>
                            <option value="locked">
                                {v.FRIENDS_BADGE_LOCKED}
                            </option>
                        </select>
                    </label>
                    <label htmlFor={`${id}-search`}>
                        {v.FRIENDS_BADGE_SEARCH}
                        <input
                            id={`${id}-search`}
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={v.FRIENDS_BADGE_SEARCH}
                        />
                    </label>
                    <p role="status">
                        {text("FRIENDS_BADGE_RESULTS", {
                            count: filtered.length,
                        })}
                    </p>
                </div>
            )}
            {expanded && shown.length === 0 && (
                <div className={styles.directoryEmpty}>
                    <p>{v.FRIENDS_BADGE_NO_MATCHES}</p>
                    <button
                        onClick={() => {
                            setFamily("all");
                            setStatus("all");
                            setQuery("");
                        }}
                    >
                        {v.FRIENDS_BADGE_CLEAR_FILTERS}
                    </button>
                </div>
            )}
            <ul
                id={`${id}-collection`}
                tabIndex={expanded ? 0 : undefined}
                aria-label={v.FRIENDS_BADGES}
            >
                {shown.map((badge) => (
                    <li key={badge.key} title={description(badge)}>
                        <RockitEmblem
                            variant={badge.visualVariant}
                            tier={badge.tier}
                            earned={Boolean(badge.earnedAt)}
                        />
                        <div>
                            <strong>{v[badge.titleKey]}</strong>
                            {expanded && (
                                <small>
                                    {
                                        v[
                                            `FRIENDS_BADGE_FAMILY_${badge.scope.toUpperCase()}`
                                        ]
                                    }
                                </small>
                            )}
                            {expanded && !compact && (
                                <p>{description(badge)}</p>
                            )}
                            <span>
                                {badge.earnedAt
                                    ? v.FRIENDS_BADGE_EARNED
                                    : v.FRIENDS_BADGE_LOCKED}
                            </span>
                            {!badge.earnedAt && (
                                <span className={styles.badgeProgress}>
                                    {text("FRIENDS_BADGE_PROGRESS", {
                                        current: Math.min(
                                            badge.current,
                                            badge.target
                                        ),
                                        target: badge.target,
                                    })}
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            <button
                className={styles.directoryExpand}
                aria-expanded={expanded}
                aria-controls={`${id}-collection`}
                onClick={() => setExpanded(!expanded)}
            >
                {expanded
                    ? v.FRIENDS_BADGE_SHOW_FEWER
                    : text("FRIENDS_BADGE_SHOW_ALL", { count: badges.length })}
            </button>
        </div>
    );
}
