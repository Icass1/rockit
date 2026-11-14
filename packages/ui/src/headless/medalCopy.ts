import type { ListeningBadgeResponse, Vocabulary } from "@rockit/shared";
import { romanTier } from "@rockit/ui/headless/medalDesign";

const lookup = (v: Vocabulary, key: string) =>
    (v as unknown as Record<string, string>)[key];
/** Display copy changes independently of persisted achievement keys and award dates. */
export function medalTitle(badge: ListeningBadgeResponse, v: Vocabulary) {
    if (badge.secret) return lookup(v, badge.titleKey) ?? badge.titleKey;
    const name = lookup(v, `MEDAL_NAME_${badge.scope.toUpperCase()}`);
    return name
        ? `${name} ${romanTier(badge.tier)}`.trim()
        : (lookup(v, badge.titleKey) ?? badge.titleKey);
}
export function medalStory(
    badge: ListeningBadgeResponse,
    v: Vocabulary,
    locale?: string
) {
    const familyKey = `MEDAL_STORY_${badge.scope.toUpperCase()}`;
    const story =
        (!badge.secret &&
            ((badge.target === 1 && lookup(v, `${familyKey}_ONE`)) ||
                lookup(v, familyKey))) ||
        lookup(v, badge.descriptionKey) ||
        badge.descriptionKey;
    const target = new Intl.NumberFormat(locale).format(badge.target);
    return story.replaceAll("{target}", target).replaceAll("{minutes}", target);
}
export function medalRarity(value: number | null | undefined, locale?: string) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 100
    )
        return null;
    return new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value / 100);
}
