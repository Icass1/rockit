"use client";

import { useId, useState, type JSX } from "react";
import type { ListeningBadgeResponse } from "@/dto";
import { designTokens } from "@rockit/theme";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "@/components/Friends/Friends.module.css";
import RockitEmblem from "@/components/Friends/RockitEmblem";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function searchable(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
}

export default function EmblemCollection({
    badges,
    compact = false,
    totalBadges,
}: {
    badges: ListeningBadgeResponse[];
    compact?: boolean;
    totalBadges?: number;
}): JSX.Element {
    const v = useVocabulary() as unknown as Record<string, string>;
    const id = useId();
    const [expanded, setExpanded] = useState(false);
    const [page, setPage] = useState(0);
    const [league, setLeague] = useState("all");
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
            (league === "all" || badge.league === league) &&
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
    const pageSize = designTokens.layout.socialEmblemPageSize;
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pages - 1);
    const shown = expanded
        ? filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
        : preview;
    return (
        <div
            className={styles.emblemCollection}
            data-compact={compact}
            data-expanded={expanded}
        >
            <p className={styles.statFootnote}>
                {text("FRIENDS_BADGE_COUNT", {
                    count,
                    total: totalBadges || badges.length,
                })}
            </p>
            {expanded && (
                <div className={styles.emblemFilters}>
                    <label htmlFor={`${id}-family`}>
                        {v.FRIENDS_BADGE_FILTER_FAMILY}
                        <select
                            id={`${id}-family`}
                            value={family}
                            onChange={(event) => {
                                setFamily(event.target.value);
                                setPage(0);
                            }}
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
                    <label htmlFor={`${id}-league`}>
                        {v.FRIENDS_BADGE_FILTER_LEAGUE}
                        <select
                            id={`${id}-league`}
                            value={league}
                            onChange={(event) => {
                                setLeague(event.target.value);
                                setPage(0);
                            }}
                        >
                            <option value="all">
                                {v.FRIENDS_BADGE_LEAGUES_ALL}
                            </option>
                            {[
                                "bronze",
                                "silver",
                                "gold",
                                "platinum",
                                "diamond",
                                "legend",
                            ].map((rank) => (
                                <option key={rank} value={rank}>
                                    {
                                        v[
                                            `FRIENDS_BADGE_LEAGUE_${rank.toUpperCase()}`
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
                            onChange={(event) => {
                                setStatus(event.target.value);
                                setPage(0);
                            }}
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
                        <Input
                            id={`${id}-search`}
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setPage(0);
                            }}
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
                            setLeague("all");
                            setPage(0);
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
                            scope={badge.scope}
                            tier={badge.tier}
                            league={badge.league}
                            earned={Boolean(badge.earnedAt)}
                        />
                        <div>
                            <strong>{v[badge.titleKey]}</strong>
                            <small>
                                {
                                    v[
                                        `FRIENDS_BADGE_LEAGUE_${badge.league.toUpperCase()}`
                                    ]
                                }
                            </small>
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
                            {!badge.earnedAt && !badge.secret && (
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
            {expanded && pages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={v.SOCIAL_PROFILE_PREVIOUS_PAGE}
                        disabled={currentPage === 0}
                        onClick={() => setPage(currentPage - 1)}
                    >
                        <ChevronLeft size={18} />
                    </Button>
                    <span
                        aria-live="polite"
                        className="text-muted-foreground text-xs"
                    >
                        {currentPage + 1} / {pages}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={v.SOCIAL_PROFILE_NEXT_PAGE}
                        disabled={currentPage === pages - 1}
                        onClick={() => setPage(currentPage + 1)}
                    >
                        <ChevronRight size={18} />
                    </Button>
                </div>
            )}
            <button
                className={styles.directoryExpand}
                aria-expanded={expanded}
                aria-controls={`${id}-collection`}
                onClick={() => {
                    setExpanded(!expanded);
                    setPage(0);
                }}
            >
                {expanded
                    ? v.FRIENDS_BADGE_SHOW_FEWER
                    : text("FRIENDS_BADGE_SHOW_ALL", { count: badges.length })}
            </button>
        </div>
    );
}
