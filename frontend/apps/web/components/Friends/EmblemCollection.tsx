"use client";

import type { JSX } from "react";
import type { ListeningBadgeResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import styles from "@/components/Friends/Friends.module.css";
import RockitEmblem from "@/components/Friends/RockitEmblem";

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
    const count = badges.filter((badge) => badge.earnedAt).length;
    return (
        <div className={styles.emblemCollection} data-compact={compact}>
            <p className={styles.statFootnote}>
                {v.FRIENDS_BADGE_COUNT.replace(
                    "{count}",
                    String(count)
                ).replace("{total}", String(badges.length))}
            </p>
            <ul>
                {badges.map((badge) => {
                    const description = v[badge.descriptionKey].replace(
                        "{minutes}",
                        String(badge.targetMinutes)
                    );
                    return (
                        <li key={badge.key} title={description}>
                            <RockitEmblem
                                variant={badge.key}
                                earned={Boolean(badge.earnedAt)}
                            />
                            <div>
                                <strong>{v[badge.titleKey]}</strong>
                                {!compact && <p>{description}</p>}
                                <span>
                                    {badge.earnedAt
                                        ? v.FRIENDS_BADGE_EARNED
                                        : v.FRIENDS_BADGE_LOCKED}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
