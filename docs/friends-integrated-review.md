# Friends: integrated review, 27 October 2026

Develop `5f61e6a0199897fbc621648d51f03785b78fda0e` is integrated into
PR [145](https://github.com/Icass1/rockit/pull/145). PR
[146](https://github.com/Icass1/rockit/pull/146) builds on that branch and contains
the XP and 115-emblem implementation. Review both together; merge 145 before 146.
The Kanban cards remain To Review for Ignacio's visual approval.

## Balance corrections

The old wide layout allocated 1.6 fractions to the central column and 0.9 to each
side, with unbounded social lists. The updated layout uses equal columns:
one below a 900px content container, two from 900px, three from 1200px. It uses
the available page width, including ultrawide screens. No artificial equal-height
panels or large artwork fill empty space. Different content states retain natural
heights; equal heights are not guaranteed when a list is expanded or empty.

Initial previews contain six friends, three shared recordings and four recent
listens. Each expands independently, with localized controls and keyboard support.
Mobile order is friends, shares, recent listens, listening together, personal
progress. Session milestones and friend comparisons are disclosures. The medal
preview contains at most three family representatives; the complete 115-item
catalogue, filters and concise requirements remain accessible on expansion.
The 320px layout also constrains shared-row min-content width so delete controls
remain inside their column.

## Browser evidence

Actual React components, generated vocabulary and application shell were rendered
in Chromium with synthetic manager/HTTP state and sample artwork. This is a UI
review, not an authenticated deployment or a backend transport test.

| Viewport | Columns | Each column, approximately |
| --- | --- | --- |
| 320 × 568 | 1 | 288px |
| 390 × 844 | 1 | 358px |
| 768 × 1024 | 1 | 672px |
| 1024 × 768 | 2 | 437px |
| 1366 × 768 | 3 | 385px |
| 1920 × 1080 | 3 | 559px |
| 2560 × 1440 | 3 | 759px |
| 3440 × 1440 | 3 | 1035px |
| 1080 × 1920 | 2 | 464px |

No document or primary-section horizontal overflow was measured at these sizes.
In the populated desktop fixture, primary section heights were 603, 594 and 579px:
a 24px spread, approximately 4%. Empty, sparse, loading, error, profile-error,
request, long-text, active-session and French states were also captured.

26 browser interaction observations passed, without JavaScript page errors:
initial preview counts; expand/collapse each feed; sent-tab reset; keyboard
collapse; blank share space does not mark read; play marks the correct share;
like/queue dispatch correct media; composer opens and submits the selected friend;
debounced search, no-results and request dispatch; reactive online count;
accept/decline requests; invite/leave sessions; milestones disclose; bounded medal
preview; all 115 medals; friendship filter; comparison disclosure; visible input
focus; and no horizontal document overflow at 200% root text size.
These observations validate mock collaborator calls, not persistence or real audio.
No local unit, integration, lint or typecheck suites were run.

## Backend and vocabulary review

Friend and sharing authorization still enforce accepted friendship, blocking,
resource visibility and ownership. Notification invalidation remains deferred
until commit. Reward accounting uses playback ownership, advancing elapsed time,
transactional persistence and idempotent event keys. Existing PostgreSQL integration
coverage includes privacy, request ownership, blocking/session authority,
notification deduplication, XP replay/rollback and catalogue backfill.

The reward framework uses generic media types, playback, relationships and shares;
no concrete provider imports or provider-name branches were introduced. Common
social/reward policy belongs in core; provider-specific integrations remain in
providers. Video achievements count recorded VIDEO plays, not inferred screen time.

All 229 referenced/static and catalogue vocabulary keys were present in English,
Spanish and French, including all 115 title/requirement pairs and nine family
labels. Placeholder sets matched across languages. Vocabulary.xlsx remains the
source; generated vocabulary was regenerated using the canonical import command.
No difficulty labels are shown.

Remote CI passed on the reviewed implementation before this documentation update:
- PR145 implementation `9059016e`: [quality and backend jobs](https://github.com/Icass1/rockit/actions/runs/40507792067).
- PR146 rewards implementation `e00b69fd`: [quality and backend jobs](https://github.com/Icass1/rockit/actions/runs/40506530718).
  Backend logs report 233 passed and 13 subtests passed. Final heads are checked
  separately in the PR Checks tab after pushing the final visual cleanup.

## Design rationale and limits

The Apple design references read for this review cover layout, visual hierarchy,
disclosure, typography, color, buttons and accessibility. Applied to Rockit's web
conventions, they support equal primary regions, people-first reading order,
progressive disclosure and explicit interactive states. They do not certify this
page or prescribe exact column ratios.

Screenshots and browser-review.json accompany this review in the delivered evidence
bundle. Safari/iOS, real authenticated multi-user WebSocket delivery and real audio
playback were not exercised in the browser fixture. Those remain deployment checks;
CI and code review do not prove every possible runtime condition.
