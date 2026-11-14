import { UserLevelResponseSchema } from "@rockit/shared";

export const listeningProfile = UserLevelResponseSchema.parse({
    userId: "circle-sam",
    username: "Sam",
    imageUrl: null,
    level: 8,
    xp: 820,
    xpToNext: 180,
    levelStartXp: 700,
    title: "",
    streak: 12,
    songsListened: 482,
    totalListeningSeconds: 181980,
    listeningBadges: Array.from({ length: 12 }, (_, index) => {
        const scopes = ["session", "total", "discovery", "plays"];
        const variants = ["ignition", "longplay", "orbit", "groove"];
        const family = index % 4;
        const tier = Math.floor(index / 4) + 1;
        const scope = scopes[family];
        return {
            key: `${scope}_${tier}`,
            titleKey: `FRIENDS_BADGE_${scope.toUpperCase()}_0${tier}`,
            descriptionKey: `FRIENDS_BADGE_${scope.toUpperCase()}_DESCRIPTION`,
            scope,
            target: tier * 100,
            current: 42,
            holderPercentage: index < 4 ? 37.5 : 0,
            visualVariant: variants[family],
            tier,
            earnedAt: index < 4 ? "2026-01-01T00:00:00Z" : null,
        };
    }),
});
