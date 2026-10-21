# Listen Together and music sharing

The Friends page is available from desktop navigation and mobile/PWA navigation.
Search for an account, send a request, and accept it from the recipient account.
Only accepted friends can share media, view listening profiles, or start a session.
Removing or blocking a friend ends their shared session. Unblocking does not
restore the friendship. Blocked accounts can be managed from the Friends tab.

## Listening session

A session has one host and one guest. Each account can have one open invitation
or session at a time. The guest must explicitly join; receiving an invitation
never starts playback. The host controls track changes, pause/resume and seek.
The guest can pause locally; periodic refreshes do not force it to resume.
The guest uses the normal authenticated Rocket player and its playback ownership
acknowledgements. Another host device that does not own playback cannot publish.
On leaving, the guest's original queue (including duplicate entries, list ids,
shuffle order and selected queue entry) and position are restored, paused.
A page reload requires the guest to join again rather than auto-starting audio.

State changes and seeks publish immediately; ongoing playback publishes at most
once every five seconds. Native progress events also drive publication when
browser timers are throttled. WebSocket invalidations are sent after commit;
a 15-second refresh repairs missed notifications. Guests correct drift above
1.5 seconds and cap position extrapolation at six seconds. If the host stops
updating, guests pause; sessions expire after two minutes without a host update.
Unanswered invitations expire after a day. No audio is uploaded or mixed on the
server; each participant streams the same media using their own session.

On Safari, a browser playback restriction can require another tap on Play in the
session panel. This uses the existing audio element, video/audio-only handling,
iOS keepalive and Media Session controls. Physical iPhone PWA lock-screen behavior
must still be checked on the target iOS release; desktop emulation cannot prove it.
This is synchronized listening, not sample-accurate audio alignment.

## Sharing and activity

Use Share in a media context menu or activity card, select a friend and optionally
add a message. Inbox entries can be played/opened, marked seen or deleted. Both
sender and recipient must already have access to a private collection; sharing
never grants playlist permissions. Sent entries retain distinct sender/recipient
identities. Inbox and sent views return the latest 100 entries.

Activity and taste comparisons use the current providers' metadata instead of
obsolete core-media columns. Profiles and leaderboard queries batch users and
history. Levels are derived from recorded listens (10 XP each); reading or
refreshing a page never awards XP.

## Validation

`backend/tests/integration/test_friends.py` covers relationships, permissions,
blocking, session transitions, media visibility, HTTP response contracts and
post-commit notifications using disposable PostgreSQL databases.
`frontend/apps/web/tests/listenTogether.test.mjs` covers explicit guest consent,
host ownership, immediate pause/seek, queue restoration, termination and logout.
The regular web suite also retains the iOS playback, streaming, transitions and
vinyl regression tests.
