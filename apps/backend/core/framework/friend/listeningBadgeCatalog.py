"""Provider-neutral collectible catalog; all display copy lives in Vocabulary.xlsx."""

from core.framework.models.listeningRewards import (
    ListeningBadgeDefinition,
    ListeningBadgeFamily,
    ListeningBadgeLeague,
    ListeningBadgeScope,
)

_ORIGINAL_FAMILIES = (
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


# Preserve every original key/title even when new milestones sit between old ones.
_ORIGINAL_TARGETS = {family.scope: family.targets for family in _ORIGINAL_FAMILIES}
LEAGUES: tuple[ListeningBadgeLeague, ...] = (
    "bronze",
    "silver",
    "gold",
    "platinum",
    "diamond",
    "legend",
)


def _additional_targets(existing: tuple[int, ...], count: int, maximum: int) -> tuple[int, ...]:
    """Choose reproducible, readable milestones across short and long horizons."""
    candidates = sorted(
        {
            step * scale
            for scale in (1, 10, 100, 1000, 10000, 100000)
            for step in range(1, 100)
            if step * scale <= maximum and step * scale not in existing
        }
    )
    if len(candidates) < count:
        raise ValueError("Not enough distinct collectible milestones")
    return tuple(
        candidates[round(index * (len(candidates) - 1) / (count - 1))] for index in range(count)
    )


# 315 new milestones in established families, distributed across all time horizons.
_EXTENSIONS = {
    "total": (75, 3000000),
    "plays": (80, 1000000),
    "discovery": (50, 50000),
    "streak": (30, 3650),
    "sharing": (25, 5000),
    "friends": (10, 250),
    "videos": (25, 10000),
    "mixed": (20, 2500),
}
BADGE_FAMILIES = tuple(
    ListeningBadgeFamily(
        family.scope,
        tuple(
            sorted(family.targets + _additional_targets(family.targets, *_EXTENSIONS[family.scope]))
        )
        if family.scope in _EXTENSIONS
        else family.targets,
        {"friends": "companions", "videos": "camera", "mixed": "fusion", "streak": "flame"}.get(
            family.scope, family.visual_variant
        ),
    )
    for family in _ORIGINAL_FAMILIES
) + (
    ListeningBadgeFamily("active_days", _additional_targets((), 50, 3650), "calendar"),
    ListeningBadgeFamily("night", _additional_targets((), 25, 10000), "moon"),
    ListeningBadgeFamily("early", _additional_targets((), 25, 10000), "sunrise"),
    ListeningBadgeFamily("weekend", _additional_targets((), 25, 25000), "weekend"),
    ListeningBadgeFamily(
        "tenure", (1, 2, 3, 7, 14, 21, 30, 45, 60, 90, 120, 150, 180, 270, 300), "hourglass"
    ),
    ListeningBadgeFamily("anniversary", tuple(range(1, 21)), "anniversary"),
)


def _family_badges(family: ListeningBadgeFamily) -> tuple[ListeningBadgeDefinition, ...]:
    badges: list[ListeningBadgeDefinition] = []
    originals = _ORIGINAL_TARGETS.get(family.scope, ())
    for index, target in enumerate(family.targets):
        legacy = _LEGACY_KEYS.get((family.scope, target))
        original_index = originals.index(target) + 1 if target in originals else None
        key = legacy or (
            f"{family.scope}_{original_index:02d}"
            if original_index
            else f"{family.scope}_milestone_{target}"
        )
        title = (
            f"FRIENDS_BADGE_{legacy.upper()}"
            if legacy
            else (
                f"FRIENDS_BADGE_{family.scope.upper()}_{original_index:02d}"
                if original_index
                else f"FRIENDS_BADGE_{family.scope.upper()}_MILESTONE_{target}"
            )
        )
        badges.append(
            ListeningBadgeDefinition(
                key=key,
                scope=family.scope,
                target=target,
                title_key=title,
                description_key=f"FRIENDS_BADGE_{family.scope.upper()}_DESCRIPTION"
                + ("_ONE" if target == 1 else ""),
                visual_variant=legacy or family.visual_variant,
                tier=index + 1,
                league=LEAGUES[min(5, index * 6 // len(family.targets))],
            )
        )
    return tuple(badges)


# Secret objectives use recorded counters, so crossing one between updates cannot miss it.
_SECRET_OBJECTIVES: tuple[tuple[str, ListeningBadgeScope, int], ...] = (
    ("answer_42", "discovery", 42),
    ("silence_404", "plays", 404),
    ("beat_808", "total", 808),
    ("leet_1337", "plays", 1337),
    ("record_45", "discovery", 45),
    ("vinyl_33", "plays", 33),
    ("concert_440", "plays", 440),
    ("binary_256", "discovery", 256),
    ("kilobyte_1024", "plays", 1024),
    ("pi_314", "total", 314),
    ("golden_1618", "total", 1618),
    ("speed_88", "plays", 88),
    ("space_2001", "total", 2001),
    ("future_1985", "plays", 1985),
    ("summer_69", "discovery", 69),
    ("studio_54", "plays", 54),
    ("route_66", "discovery", 66),
    ("area_51", "discovery", 51),
    ("eleven_11", "total", 11),
    ("power_9000", "total", 9000),
    ("nights_1001", "night", 1001),
    ("unlucky_13", "discovery", 13),
    ("stereo_2", "sharing", 2),
    ("countdown_321", "plays", 321),
    ("thousand_days", "active_days", 1000),
)


def _secret_badges() -> tuple[ListeningBadgeDefinition, ...]:
    return tuple(
        ListeningBadgeDefinition(
            key=f"secret_{name}",
            scope="secrets",
            metric=metric,
            target=target,
            title_key=f"FRIENDS_BADGE_SECRET_{name.upper()}",
            description_key=f"FRIENDS_BADGE_{metric.upper()}_DESCRIPTION"
            + ("_ONE" if target == 1 else ""),
            visual_variant="artifact",
            tier=index + 1,
            league=(
                "legend"
                if metric == "active_days"
                else "diamond"
                if target >= 9000
                else "platinum"
                if target >= 1000
                else "gold"
                if target >= 400
                else "silver"
                if target >= 100
                else "bronze"
            ),
            secret=True,
        )
        for index, (name, metric, target) in enumerate(_SECRET_OBJECTIVES)
    )


LISTENING_BADGES = (
    tuple(badge for family in BADGE_FAMILIES for badge in _family_badges(family)) + _secret_badges()
)
