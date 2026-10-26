# Listening XP — KB-35

XP now accrues from bounded, advancing playback positions on the active playback
owner, rather than converting every play into ten points whenever a profile loads.
Policy lives in `listeningPolicy.py`, independent of concrete music providers.

Session milestones award incremental 20 / 30 / 40 / 120 XP at 10 / 20 / 30 / 60
minutes (210 XP for all four). These are initial adjustable policy values. Short
pauses do not count, and after 90 seconds without credited listening a fresh
session begins. Tracks can change within a session. Seeks only rebase the cursor.
Positions are bounded by server elapsed time, accept observation gaps up to 75
seconds and tolerate 1.5 seconds of position jitter. No offline time is inferred.
This validates reported progress; it is not proof that a physical speaker is audible.

The database cursor is locked per user. Each session/milestone has a unique XP
event; cursor, event and wallet update share one transaction. Reconnection and
multiple tabs cannot replay the same milestone award. The existing playback-owner
protocol gates heartbeats; providers retain their own media behavior.

Existing XP is preserved. First timed playback freezes legacy recorded-play credit
at the greater of stored XP and historical plays × 10. Subsequent profile reads
never overwrite XP. Real listen counts are queried independently of points.
Personal and friend profiles share the same batch projection, without N+1 queries.
Social invalidations run after commit, every 30 credited seconds for the listener
and at awards for accepted friends.

New tables are registered with Core metadata and created by the normal DB init
path. No existing table columns change. No local tests were run; CI validates the
implementation. Text lives in Vocabulary.xlsx; generated contracts are not edited
by hand. Friends UI keeps personal progress after social content on mobile.

## Rockit emblems — KB-36

Six logo-based vector treatments carry distinct silhouettes, orbit/groove details
and muted metal colours: Ignition (10-minute session), Orbit (20), Deep groove
(30), Side B (60), Sound cartographer (300 accumulated minutes) and Interstellar
(1440). Labels and requirements are translated in the workbook. The collection
shows locked requirements explicitly; colour is not the only status signal.

Unlocks persist once per user/key with an earned timestamp. Emblems do not grant
extra XP, avoiding double rewards. Profiles project the entire catalog and earned
state in a batch query. Accepted-friend comparisons show both collections and
their earned intersection; blocking and friendship access checks remain intact.
