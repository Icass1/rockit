# Search response and API usage

The web search renders a skeleton immediately and waits 300 ms after typing before starting network work. Queries shorter than two characters stay local. All mounted search inputs share the same debounce timer and text. A query version prevents obsolete results and queued requests from replacing the current search.

`GET /media/search/providers` advertises searchable providers using their public names as identifiers; internal database IDs stay on the server. The web client uses two workers to call `POST /media/search/provider`, publishing each response immediately instead of waiting for the slowest provider. Providers without search implementations are excluded. YouTube Data API searches are explicitly requested through the YouTube button because a video search consumes 100 quota units. The legacy aggregate endpoint retains its response contract for mobile and radio clients.

The server reuses normalized queries for 60 seconds, coalesces identical in-flight requests, and limits each process to four active provider searches and 32 pending searches. Each search owns its database transaction. The cache holds at most 128 windows; errors trigger a 10-second provider cooldown, including for different queries. Search work has a 20-second deadline. These bounds apply per worker process, not globally across deployments; they are not a guarantee against exhausting a provider's account-wide quota. YouTube's blocking HTTP search runs in a thread.

Horizontal sections load more when the user scrolls within 320 px of the end, with a keyboard-accessible button as an alternative. Expansion is supported by Spotify Scrapper, YouTube Music, and Radio Browser. Windows grow 15 → 30 → 60 → 100; they stop when a provider returns fewer items or reaches the cap. This deliberately uses bounded expanding windows, not unlimited cursor pagination: the current Spotify scraper and YouTube Music wrappers expose a result limit rather than a continuation cursor. Earlier items are merged without duplication. For providers returning all categories, the server reuses the same window across sections. YouTube Music expands only the requested category. Providers without expansion support, including the YouTube video Data API wrapper and local uploads, retain their existing result limits.

The frontend caches up to 20 completed searches for 60 seconds and clears them at sign-out. Downloaded versions are the default when providers return the same named item and artists; all alternative sources remain available. Partial failures preserve successful results and expose a retry action.

## Choosing a provider

Search cards show the available provider icons, falling back to the provider name when no icon exists. Opening a card shows a source selector above its actions. Selecting a source changes the URL used for library, playlist, and download actions, without starting a request. Library and download labels explicitly name the selected provider. Local downloaded versions remain the default while users can choose another source.

Grouping uses exact normalized title, type, and artist names. Separate editions from the same provider stay on separate cards. Playlist and radio identities use their URLs because their titles alone cannot establish identity. Card keys stay stable while other providers respond, preserving a user's selection.

The action surface follows the vendored Apple design skill: [Menus › Labels and Submenus](../skills/apple-design-skill/references/hig/menus.md) calls for clear action labels and shallow menus; [Accessibility](../skills/apple-design-skill/references/hig/accessibility.md) guides keyboard access and touch targets. Source choices use 44 px minimum buttons, text plus icons, a check mark, and `aria-pressed`. The mobile menu has an opaque surface, compact media header, explicit Cancel action, and backdrop. Search cards open with a normal tap and preserve horizontal scrolling. Keyboard users can open cards, select sources, activate actions, and close with Escape, which restores focus.

## Deployment

Deploy backend and web together. Import the updated translated labels from the updated workbook using the existing command, from the repository root:

```sh
python -m backend import-vocabulary
```

The native response/request schemas and HTTP methods were generated using the repository generators. No new runtime packages are needed.

## Validation

```sh
python -m pytest backend/tests/unit/test_search.py -q
cd frontend/apps/web
node tests/search.test.mjs
pnpm exec eslint components/Search lib/managers/searchManager.ts models/search.ts
pnpm exec tsc --noEmit
```

Tests use mocked providers and HTTP; they verify request counts, progressive results, stale response isolation, explicit video intent, cache reuse, cooldowns, independent sessions, timeout cleanup, expansion, and duplicate scroll events. Production latency and provider throttling still need measurement with deployed credentials; these tests make no latency claim about real external APIs.

Vocabulary regression checks read the Excel values as the importer does, including cached formula values. Every key used by search and its library/download actions must have English, Spanish, and French values with matching placeholders. The frontend test also parses TSX to reject hardcoded search headings and accessibility labels. Some old translations were uncached Excel formulas; the keys used here now have explicit translated values.

Browser validation used the production search and context-menu components with simulated API responses in Chromium at 1280×900, 390×844, and 844×390. It verified touch and keyboard source selection, correct selected URLs for library and download requests, no extra searches when switching sources, and no horizontal page overflow. This is separate from real-provider latency testing.
