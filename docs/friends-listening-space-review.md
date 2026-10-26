# Friends redesign — KB-33

Branch: `feat/friends-listening-space`, based on develop independently of PR #143.

This is a proposal for review, not a confirmed product-wide visual system.
The screen puts listening activity and people first. Shared music and listening
sessions have separate views; rankings and the listening passport remain available
behind a disclosure. Artwork and spacing carry the hierarchy instead of repeated
panel borders, gradients and badges. The existing application shell is unchanged.

References: [Apple Design](https://github.com/dickwu/apple-design-skill) and
[Impeccable](https://github.com/pbakaus/impeccable). Apple principles apply to the
web implementation: readable text, explicit state, keyboard focus, comfortable
hit targets, responsive layout and meaningful grouping. Impeccable supplies the
Operate mode and craft floor. Its optional remote concept catalog was unavailable;
the proposal is grounded in the existing product and is not an approved comp.

## Behavior

- Search starts after a short typing pause, with visible pending/empty results.
- The directory sorts online friends first and exposes invite actions directly.
- Remove/block actions ask for inline confirmation; overflow actions are keyboard
  accessible and close on Escape or focus leaving the menu.
- Activity plays existing media through SharingManager; like, queue and share
  keep their current services. No invented live/progress data is displayed.
- Unread shares are marked seen by activating their media action; merely clicking
  unused row space no longer changes read state.
- Request, session, leaderboard and blocking APIs remain unchanged.

## Visual review and limits

Screenshots use the current components in an isolated Chromium rendering with
mock manager state, sample people/music and existing local pictures as example
covers. They do not verify authentication, persistence, real audio, WebSocket
updates or Safari/iPhone behavior. No local test suites were run.

Widths inspected: 1440, 768, 390 and 320 CSS pixels. Additional captures cover
requests, search, empty/error/loading states, long names/titles, shared music,
listening sessions and rankings. CI runs separately on GitHub.

## Revision: use wide screens

The fixed 1240px content wrapper was rejected during visual review. The page now
uses the available app pane. Recent activity moves alongside the featured listen
at 1280px of container width; at 1900px a contextual rail exposes listening
sessions and shared music. At 2600px the recent-listen region gains a second
column. Artwork is capped at 50dvh / 640px so it does not push track actions below
a 1080px viewport. Shared media and invitations also use the additional width.

New captures include 1920x1080 and 3440x1440, using nine sample activities to show
normal populated behavior. The displayed people, tracks and covers remain example
data outside production code. Mobile, tablet and prior interaction-state captures
were refreshed. No local test suites were run.
