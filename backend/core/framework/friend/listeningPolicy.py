from backend.core.framework.models.listeningRewards import ListeningMilestone

# Incremental awards, once per milestone per session. Policy is provider-neutral.
SESSION_MILESTONES = (
    ListeningMilestone(minutes=10, xp=20),
    ListeningMilestone(minutes=20, xp=30),
    ListeningMilestone(minutes=30, xp=40),
    ListeningMilestone(minutes=60, xp=120),
)
SESSION_BREAK_SECONDS = 90
MAX_OBSERVATION_GAP_MS = 75_000
POSITION_TOLERANCE_MS = 1500

from backend.core.framework.models.listeningRewards import ListeningBadgeDefinition

LISTENING_BADGES = (
    ListeningBadgeDefinition(
        "ignition",
        "session",
        10,
        "FRIENDS_BADGE_IGNITION",
        "FRIENDS_BADGE_SESSION_DESCRIPTION",
    ),
    ListeningBadgeDefinition(
        "orbit",
        "session",
        20,
        "FRIENDS_BADGE_ORBIT",
        "FRIENDS_BADGE_SESSION_DESCRIPTION",
    ),
    ListeningBadgeDefinition(
        "groove",
        "session",
        30,
        "FRIENDS_BADGE_GROOVE",
        "FRIENDS_BADGE_SESSION_DESCRIPTION",
    ),
    ListeningBadgeDefinition(
        "longplay",
        "session",
        60,
        "FRIENDS_BADGE_LONGPLAY",
        "FRIENDS_BADGE_SESSION_DESCRIPTION",
    ),
    ListeningBadgeDefinition(
        "atlas", "total", 300, "FRIENDS_BADGE_ATLAS", "FRIENDS_BADGE_TOTAL_DESCRIPTION"
    ),
    ListeningBadgeDefinition(
        "voyager",
        "total",
        1440,
        "FRIENDS_BADGE_VOYAGER",
        "FRIENDS_BADGE_TOTAL_DESCRIPTION",
    ),
)
