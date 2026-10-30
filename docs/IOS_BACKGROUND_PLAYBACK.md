# iOS background track handoff

The web transition mixer routes media through Web Audio and promotes a second audio
element. That route is unsuitable for reliable iOS background playback: suspension
of the AudioContext or loss of permission to start the second deck can leave the
next track silent until another user gesture. This is a code-level risk consistent
with the reported symptom, not a reproduction on a physical iPhone.

On iOS/iPadOS the web player now uses native audio even if saved transition settings
are enabled. It does not activate the mixer, attach media sources, promote a second
deck or schedule transition/bounds work. The saved preference is retained; settings
show transitions unavailable with an en/es/fr explanation from Vocabulary.xlsx.
Other platforms retain transitions. User volume remains 100% on iOS and is not saved.

The iOS ended fallback previously ignored paused elements and advanced within the
last 0.3 seconds. Ended media is normally paused, so it missed the very state it
needed to recover. Recovery now checks actual ended/exhausted state, playback intent,
ownership, loading state and the active audio mode. It preserves the tail and does
not advance a manually paused item. Native ended events respect manual pause too.
Recovery also runs when visibility returns if native events/timers were suspended.
It does not promise that timers execute while iOS freezes a page.

The same native element is retained across ordinary song changes. Server ownership
confirmation is still required when connected; this patch does not bypass playback
arbitration or treat a stale socket as an owner grant.

CI fixtures exercise the actual manager with iPhone detection, hidden documents,
missed ended events, suspended timers, manual pause, duplicate recovery, native
identity and pending server grants. Existing transition fixtures now use desktop
identity explicitly, and their old error-navigation assertions follow the existing
one-minute recovery delay. A backend wrapper includes these browser fixtures in CI.
No local suites were run. Desktop fixtures and a simulated iPhone do not replace
physical iOS/PWA validation of lock-screen playback, next-track controls, offline
sources or background socket delivery. The user's installed PWA must load the new
client code after deployment before this behavior can be assessed.
