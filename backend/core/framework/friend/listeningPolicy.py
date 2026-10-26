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
