"""Provider-neutral collectible catalog; all display copy lives in Vocabulary.xlsx."""

from core.framework.models.listeningRewards import (
    ListeningBadgeDefinition,
    ListeningBadgeFamily,
)

BADGE_FAMILIES = (
    ListeningBadgeFamily(
        "session",
        (
            1,
            2,
            3,
            5,
            10,
            15,
            20,
            25,
            30,
            40,
            45,
            60,
            75,
            90,
            120,
            150,
            180,
            240,
            300,
            360,
        ),
        "ignition",
    ),
    ListeningBadgeFamily(
        "total",
        (
            5,
            15,
            30,
            60,
            120,
            180,
            300,
            600,
            900,
            1440,
            2160,
            2880,
            4320,
            7200,
            10080,
            14400,
            21600,
            30000,
            43200,
            60000,
            86400,
            120000,
            180000,
            240000,
            525600,
        ),
        "orbit",
    ),
    ListeningBadgeFamily(
        "plays",
        (
            1,
            5,
            10,
            25,
            50,
            100,
            250,
            500,
            1000,
            2000,
            3500,
            5000,
            7500,
            10000,
            15000,
            25000,
            50000,
            75000,
            100000,
            250000,
        ),
        "groove",
    ),
    ListeningBadgeFamily(
        "discovery",
        (1, 3, 5, 10, 25, 50, 100, 200, 350, 500, 750, 1000, 2000, 5000, 10000),
        "atlas",
    ),
    ListeningBadgeFamily("streak", (2, 3, 5, 7, 10, 14, 21, 30, 60, 100), "longplay"),
    ListeningBadgeFamily("sharing", (1, 2, 3, 5, 10, 20, 35, 50, 75, 100), "voyager"),
    ListeningBadgeFamily("friends", (1, 3, 5, 10, 25), "orbit"),
    ListeningBadgeFamily("videos", (1, 5, 20, 50, 100), "longplay"),
    ListeningBadgeFamily("mixed", (1, 5, 10, 25, 50), "atlas"),
)
_LEGACY_KEYS = {
    ("session", 10): "ignition",
    ("session", 20): "orbit",
    ("session", 30): "groove",
    ("session", 60): "longplay",
    ("total", 300): "atlas",
    ("total", 1440): "voyager",
}


def _family_badges(
    family: ListeningBadgeFamily,
) -> tuple[ListeningBadgeDefinition, ...]:
    badges: list[ListeningBadgeDefinition] = []
    for index, target in enumerate(family.targets):
        legacy = _LEGACY_KEYS.get((family.scope, target))
        key = legacy or f"{family.scope}_{index + 1:02d}"
        badges.append(
            ListeningBadgeDefinition(
                key=key,
                scope=family.scope,
                target=target,
                title_key=(
                    f"FRIENDS_BADGE_{legacy.upper()}"
                    if legacy
                    else f"FRIENDS_BADGE_{family.scope.upper()}_{index + 1:02d}"
                ),
                description_key=f"FRIENDS_BADGE_{family.scope.upper()}_DESCRIPTION"
                + ("_ONE" if target == 1 else ""),
                visual_variant=legacy or family.visual_variant,
                tier=index + 1,
            )
        )
    return tuple(badges)


LISTENING_BADGES = tuple(badge for family in BADGE_FAMILIES for badge in _family_badges(family))
