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
