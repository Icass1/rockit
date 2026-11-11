RockIt! — Documentation index
Repository documentation for develop. This index points to existing files without
changing their locations. Some entries are historical snapshots or pending-review
work; use the repository's current source and applicable AGENTS.md as the source
of truth when evidence differs.

Which platform am I working on?
Target	Current architecture	Start here
Desktop web	Next.js (apps/web)	[Web agent guide](../apps/web/AGENTS.md) · [Implementation](FRONTEND_IMPLEMENTATION.md)
iPhone/iPad	Home Screen PWA built with Expo / React Native Web (apps/mobile)	[Mobile agent guide](../apps/mobile/AGENTS.md) · [Deployment](FRONTEND_DEPLOYMENT.md)
Android	Native Expo / React Native application, including APK builds (apps/mobile)	[Mobile agent guide](../apps/mobile/AGENTS.md) · [Android builds](BUILDINGAPKIPA.md)
API and storage	FastAPI, PostgreSQL and S3-compatible storage (apps/backend)	[Backend agent guide](../apps/backend/AGENTS.md) · [Container deployment](DOCKER.md)


Platform boundary: an installed iOS PWA is not an iOS native IPA and cannot
be assumed to support native APIs. Native Android and browser playback have different
requirements. See the [implemented architecture](FRONTEND_IMPLEMENTATION.md).
Start here
- [Project overview and local development](../README.md)
- [Contributing](../CONTRIBUTING.md) ([docs shortcut](CONTRIBUTING.md))
- [Root engineering instructions](../AGENTS.md)
- [Web engineering instructions](../apps/web/AGENTS.md)
- [Mobile engineering instructions](../apps/mobile/AGENTS.md)
- [Backend engineering instructions](../apps/backend/AGENTS.md)
- [Project board](Kanban.md) — active work items, not architectural authority
Architecture and technical boundaries
- [Implemented frontend architecture and diagrams](FRONTEND_IMPLEMENTATION.md)
- [Frontend platform decision and rationale](FRONTEND_PLATFORM_ARCHITECTURE.md)
- [Independent web/mobile deployment](FRONTEND_DEPLOYMENT.md)
- [Backend provider boundaries](provider-boundaries.md)
- [Playback synchronization](PLAYBACK_SYNC.md)
- [iOS browser/PWA playback constraints](IOS_MEDIA_PLAYBACK.md)
- [Web/backend guide (legacy-style references: review against AGENTS)](web-guide.md)
- [Backend guide (legacy-style references: review against AGENTS)](backend-guide.md)
- [Frontend migration implementation history](FRONTEND_MIGRATION_PROGRESS.md)
Development, release, deployment and verification
- [Build Android APK and other EAS targets](BUILDINGAPKIPA.md)
- [Android preview investigation (dated)](ANDROID_PREVIEW_INVESTIGATION.md)
- [Frontend test and acceptance matrix](FRONTEND_TESTING.md)
- [Backend tests](backend/tests.md) ([old link shortcut](backend-tests.md))
- [Docker and Compose operations (review commands before running)](DOCKER.md)
- [YouTube downloader operations](YOUTUBE_DOWNLOADS.md)
- [Mobile and desktop deployment](FRONTEND_DEPLOYMENT.md)
- [Prettier notes (historical)](web/prettier.md)
Features and product behavior
Library, search and collections
- [Library track search](LIBRARY_SONG_SEARCH.md)
- [Library drag and drop](LIBRARY_DRAG_DROP.md)
- [Collection pagination](collection-pagination.md)
- [Navigation pins](NAVIGATION_PINS.md)
- [Search behavior and performance](search-performance.md)
- [Search catalogue hotfix (incident reference)](SEARCH_INDEX_CATALOGUE_HOTFIX.md)
Audio, lyrics, player and discovery
- [Playback synchronization](PLAYBACK_SYNC.md)
- [Lyrics lookup and timing](LYRICS_MATCHING.md)
- [Recording selection](SONG_RECORDING_SELECTION.md)
- [Recording content ratings](CONTENT_RATINGS.md)
- [Recommendations](RECOMMENDATIONS.md)
- [Cached silence boundary analysis](audio-silence-analysis.md)
- [Web song transitions](web-transitions.md)
- [Player follow-ups](PLAYER_FOLLOWUPS.md)
- [PiP and recommendations scroll fix](PIP_RECOMMENDATION_SCROLL.md)
- [iOS media playback](IOS_MEDIA_PLAYBACK.md)
Downloads, metadata and export
- [Downloads experience](downloads-experience.md)
- [YouTube downloads](YOUTUBE_DOWNLOADS.md)
- [ZIP export](zip-export.md)
- [Explicit/clean/unknown recording metadata](CONTENT_RATINGS.md)
- [Content rating implementation and rollout notes](CONTENT_RATING_IMPLEMENTATION_PLAN.md)
Social and accounts
- [Friends and Listen Together](listen-together.md)
- [Listening XP and rewards](listening-rewards.md)
- [Notifications](notifications.md)
- [Artist pages](features/artist-pages.md)
- [MusicBrainz integration](features/musicbrainz.md)
- [Web Friends product/design brief](web/friends.md)
Plans, progress and review snapshots
Snapshot/plan documents can describe branches, future gates or experiments. They
are not proof that every proposed feature is shipped or device-tested.

- [Frontend migration progress](FRONTEND_MIGRATION_PROGRESS.md)
- [Next.js refactor plan](web/nextjs-refactor-plan.md)
- [Next.js refactor progress](web/nextjs-refactor-progress.md)
- [Next.js refactor inventory (large snapshot)](web/nextjs-refactor-inventory.md)
- [Content rating implementation/acceptance](CONTENT_RATING_IMPLEMENTATION_PLAN.md)
- [Friends design review](friends-design-review.md)
- [Friends listening space review](friends-listening-space-review.md)
- [Friends integrated review](friends-integrated-review.md)
- [Header blur review](header-blur-review.md)
- [Player responsive layout review](player-layout-review.md)
- [PiP responsive review](pip-responsive-review.md)
- [Page loading study](page-loading-study.md)
- [PiP/recommendations follow-up](PIP_RECOMMENDATION_SCROLL.md)
- [Android preview diagnosis](ANDROID_PREVIEW_INVESTIGATION.md)
- [Search index hotfix](SEARCH_INDEX_CATALOGUE_HOTFIX.md)
Supporting artifacts
- [Frontend architecture diagrams](diagrams/)
- [Player follow-up assets](images/player-followups/)
- [Responsive player prototype](mockups/player-ui-responsive.html)
- [Artist image research](research/artist-images.md)
- [Agent skill references](skills/) — these may contain source materials and workflows; do not bulk-move
- [Apple design skill references](skills/apple-design-skill/)
- [Web design brief](web/product.md)
Historical / pending triage
The following are not recommended as current setup or engineering instructions:
- [Expo starter boilerplate](EXPOdocs.md) — old scaffold
- [Old frontend setup](FRONTENDsetup.md) — references removed paths and legacy commands
- [Old rules](Rules.md) — potentially conflicts with root and app AGENTS.md
- [Prior mobile shell step](FRONTENDmigration.md) — an early implementation prompt, not a current roadmap
- [Captured model conversation](infoGM51.md) — transcript, not project documentation
- [Archived repository guide](archive/repository-guide.md)
- [Archived Claude guide](archive/claude-guide.md)
- [Older frontend/mobile skill notes](skills/frontend-web.md) and [mobile notes](skills/frontend-mobile.md) — verify against the current app guides
These can be moved into an explicit legacy archive only after checking inbound links.
Preserve provenance and never silently replace old claims with new ones.
Documentation maintenance policy
1. Prefer linking to the existing source of truth over duplicating entire guides.
2. Separate implemented behavior, planned work, and historical investigation.
3. Record branch/commit/date when a document is a snapshot; avoid claiming untested device compatibility.
4. Do not describe the iOS Home Screen PWA as a native iOS application.
5. When moving Markdown or SVG/HTML assets, preserve and validate all relative links.
6. Before deleting anything, search for inbound links and inspect the latest active use.