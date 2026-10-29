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

The catalogue contains 115 named emblems: 20 session, 25 accumulated-time,
20 recorded-listen, 15 discovery, 10 streak, 10 sharing, 5 friendship, 5 video and 5 combined discovery/sharing achievements. Six vector motif
families share a rounded hexagonal medal die, warm metallic bevel, family-coloured
enamel, the existing Rockit logo and an engraved tier number. Locked medals use
a matte neutral finish and a lock icon; the design remains legible at 40px. There are no
difficulty labels, filters or colour categories. Names and concise requirements
are translated in Vocabulary.xlsx.

Discovery counts distinct recorded media. Sharing counts distinct recipient/media
pairs, so repeatedly sending the same recording to the same friend adds no credit.
Mutually accepted friendships count only while both relationship rows are accepted;
friendship awards persist after later removal. Video milestones count registered
completed plays of the generic VIDEO media type, not screen visibility. Combined
achievements require both distinct recordings and distinct recommendations to
reach the target. Radio and video-specific listening-time counters are not yet
recorded reliably and are excluded rather than inferred from duration metadata.
Valid recorded listens, accepted friendships and successful shares evaluate achievements immediately;
profile projection also backfills existing history. Duration badges are evaluated
alongside verified playback. Existing six badge IDs and earned timestamps survive.
Owned session badges prove eligibility for lower session tiers during backfill.
Historical uninterrupted sessions are not guessed from play counts.

Unlocks persist once per user/key with an earned timestamp. Emblems do not grant
extra XP. Profile and comparison projections batch statistics and earned state;
new awards use one JSON recordset insert rather than per-badge queries. The initial
collection shows up to three recent family representatives, with an expandable, scrollable
catalogue filtered by family, earned state and text. The collapsed preview shows award names, earned/locked state and numeric progress;
expanded medals show family labels and concise requirements. Accepted-friend comparisons show collections
catalogue filtered by family, earned state and text. Locked requirements
and numeric progress remain explicit. Accepted-friend comparisons show collections
and their earned intersection; friendship and blocking access checks remain intact.

## Provider boundary and vocabulary review

Rewards use shared playback positions, recorded core media types, mutually accepted
friendships and recorded shares. Reward framework/access modules do not import
concrete providers or branch on provider names. Provider-specific playback,
metadata and integration behavior belongs in each provider; the common reward
policy intentionally remains in core so all providers share the same rules.

All 115 badge names and concise requirements, family labels and catalogue controls
come from Vocabulary.xlsx in English, Spanish and French. Generated vocabulary and
response schemas are regenerated from their canonical sources. Difficulty is
removed from the response schema as well as labels, filters and emblem colours.

The personal progress section keeps current session progress visible and places
its milestone breakdown inside a native disclosure. The complete 115-emblem
catalogue and all family filters remain available through Explore all. This keeps
the default rewards view secondary to the three equally weighted social columns.
