# Playback synchronization

A playback occurrence is identified by `mediaPublicId`, `queueMediaId`, and
`playbackId`. A new local selection creates a playback ID, including when the
same media appears multiple times in the queue. Explicitly starting playback on
a following device creates a new playback ID and transfers playback ownership.

Only one connected device plays for each user. The last Play request accepted
by the server wins, including when both devices request playback together.
`current_media` responses include `isPlaybackOwner`: other devices receive
`false` and pause both native decks immediately, even if the new media is not
in their loaded queue. The accepted device receives `true` after the server
sends the revocations. Connected players wait for this grant before starting
sound. An ownership snapshot does not restart a device the user has paused.
Following devices display progress and can seek without starting playback.

Offline playback remains available. A disconnected device cannot receive a
remote pause; exclusivity is restored when it reconnects.

`current_media` includes that identity, the queue type, and `currentTimeMs`.
The server validates the queue item before accepting a selection, closes the
previous listening interval, and saves the new position. Each user's incoming
messages are serialized across sockets. A received selection loads using the
position in the message, without announcing it back to the server. Opening a
device and loading its saved queue does not claim playback ownership.

`current_time`, `seek`, and `media_ended` requests must include all three identity
fields. The server discards messages that do not match its active occurrence.
Only the owning socket can publish periodic positions or end events. Progress
is throttled to once per second while playing and is dropped while disconnected.
Positions relayed to other devices retain their identity. Clients also reject
mismatched identities and positions beyond the current media's known duration.

A matching explicit seek can originate on any device. The server persists it
and relays a `current_time` message with `isSeek: true`. Receivers seek their
native player without sending another seek. Ordinary progress updates update
following devices' displayed position without generating outgoing progress.

Clients request `playback_state` after queue initialization and on connection.
The server replies to that socket with its active `current_media` snapshot, if
available. Source loads are serialized and superseded loads are discarded;
native progress events are ignored during source transitions.

Deploy the backend, web app, and rebuilt mobile app together. Playback messages
from older clients without playback identity are rejected rather than applied
without a media association.

Run backend regressions from the repository root:

```sh
venv/bin/python -m unittest discover -s backend/tests -v
```

Run shared player regressions using the web workspace's installed esbuild:

```sh
node -e 'require("./frontend/apps/web/node_modules/esbuild").buildSync({entryPoints:["frontend/packages/shared/tests/playbackSync.test.ts"],outfile:"/tmp/rockit-playback-tests.cjs",bundle:true,platform:"node",format:"cjs",tsconfig:"frontend/packages/shared/tsconfig.json"})'
node /tmp/rockit-playback-tests.cjs
```
