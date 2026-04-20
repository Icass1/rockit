I'll explore the docs/ directory to understand what documentation is available.
→ Read .
✱ Glob "docs/\*_/_" in . (9 matches)
Here are the documentation files in docs/:
File
AGENTSbackend.md
AGENTSfrontend.md
EXPOdocs.md
BUILDINGAPKIPA.md
DOCKER.md
FRONTENDsetup.md
FRONTENDmigration.md
Rules.md
CONTRIBUTING.md
Which doc(s) would you like me to read in detail?
▣ Plan · GLM-5.1 · 43.9s
Todos
The user just said "Todos" — let me check the current todo list status. There's no active todo list for this session. Could you clarify what you'd like me to do?

- Create a todo list for a specific task you have in mind?
- Review the docs I listed and plan something based on them?
- Something else?
  ▣ Plan · GLM-5.1 · 8.2s
  Lee todo para enterarte de como funciona el proyecto
  I'll read all the docs and the AGENTS.md to fully understand how the project works.
  → Read docs/AGENTSbackend.md
  → Read docs/AGENTSfrontend.md
  → Read docs/EXPOdocs.md
  → Read docs/BUILDINGAPKIPA.md
  → Read docs/DOCKER.md
  → Read docs/FRONTENDsetup.md
  → Read docs/FRONTENDmigration.md
  → Read docs/Rules.md
  → Read docs/CONTRIBUTING.md
  Aquí tienes un resumen completo de cómo funciona el proyecto Rockit:

---

Rockit — Resumen del Proyecto
Qué es: Un reproductor de música self-hosted.
Stack Tecnológico
Capa
Frontend Web
Frontend Mobile
Backend
APIs externas
Deploy

---

Backend — Arquitectura
3 capas estrictas: controllers/ → framework/ → access/ → DB
Capa Hace
Controllers HTTP, valida con Pydantic, llama framework, lanza HTTPException
Framework Lógica de negocio, orquesta
Access CRUD SQLAlchemy, retorna ORM
5 negocios: core, default, spotify, youtube, rockit — NADA de otros negocios en core.
Patrones clave:

- Toda función retorna AResult (nunca raise). HTTPException solo en controllers.
- Sesión DB por request via DBSessionMiddleware.
- public_id (UUID) para el cliente, nunca el id interno.
- Providers: sistema extensible (Spotify, YouTube, Rockit) con BaseProvider.
- Auth: sesión cookie session_id, AuthMiddleware.auth_dependency para proteger endpoints.
  Comandos:
- uvicorn backend.core.main:app --reload
- venv/bin/python -m pyright (typecheck)
- venv/bin/python -m black <file> (format)
- python3 -m backend init-db
- python3 -m backend zod (genera DTOs Zod para frontend)

---

Frontend Web — Arquitectura
Monorepo pnpm: apps/web/ + apps/mobile/ + packages/shared/
Regla fundamental: page.tsx NUNCA tiene "use client". Pages = Server Components. Lógica interactiva va en \*Client.tsx.
Patrones:

- Server-side: fetch() en page.tsx con revalidate.
- Client-side: useFetch hook o apiFetch — siempre validación Zod.
- Estado: Nanostores (createAtom, createArrayAtom) + useStore.
- Lógica de negocio: Managers (mediaPlayerManager, queueManager, playlistManager, etc.) vía singleton rockIt.
- Errores: AppError + error.tsx boundary.
- DTOs: auto-generados en packages/shared/src/dto/ — NUNCA editar manualmente.
- Hidratación: no retornar null basado en atoms (causa mismatch), usar elemento invisible.
  Comandos:
- pnpm dev / pnpm build / pnpm lint
- npx tsc --noEmit (typecheck)

---

Frontend Mobile (Expo)

- File-based routing con expo-router.
- SafeAreaProvider obligatorio, StyleSheet.create() (no Tailwind/NativeWind).
- No importar de next/\*, no usar HTML elements, no window/document.
- Misma paleta de colores que web.
- Build: EAS Build con pnpm build:android:preview, pnpm build:ios:production, etc.

---

Docker
3 servicios: Postgres (puerto 5432), Backend (8000), Frontend (9100→3000). Variables en .env.production. Comandos: docker compose up -d, docker compose build, docker compose logs -f.

---

Convenciones Comunes

- Todo en inglés, imports absolutos (@/ en frontend, full paths en backend).
- Sin console.log en producción.
- Keyword args obligatorios en Python.
- Tablas DB: singular (user no users), columnas snake_case.
- Imports orden: stdlib → utils → aResult → access → framework → middleware → responses → requests.
  ▣ Plan · GLM-5.1 · 3m 44s
  Ahora necesito que completes la página de Vamos a ir página página paso a paso Yo tenía antes una aplicación Pero como lo he pasado todo a react Y he separado el móvil De la página web Ahora solo me falta mirar la página web antigua a la nueva limpiando absolutamente y rehaciendo absolutamente todo el código Entonces mira qué páginas tengo ahora mismo en /home/nicorebo18/rockit/frontend/apps/web (Que es la app buena) Y compárala con las que tenía antes en /home/nicorebo18/rockit/frontend/apps/test/frontend/apps/web Hazme una lista detallada de todas las páginas lo que les faltaría por implementar Y lo que ya está implementado A nivel Futures Y de cosas que haya que tener en cuenta Insisto vamos a ir página página así que detalla cada página Al milímetro
  Voy a explorar ambas aplicaciones en detalle para compararlas página por página.
  │ Explore Task — Explore new web app pages
  Unknown agent type: Explore is not a valid agent type
  │ Explore Task — Explore old web app pages
  Unknown agent type: Explore is not a valid agent type
  ctrl+x down view subagents
  ✱ Glob "app/**/page.tsx" in frontend/apps/web (12 matches)
  ✱ Glob "app/**/layout.tsx" in frontend/apps/web (3 matches)
  ✱ Glob "app/**/error.tsx" in frontend/apps/web (1 match)
  ✱ Glob "app/**/not-found.tsx" in frontend/apps/web (1 match)
  ✱ Glob "app/**/loading.tsx" in frontend/apps/web (1 match)
  ✱ Glob "components/**/_.tsx" in frontend/apps/web (84 matches)
  ✱ Glob "lib/managers/_.ts" in frontend/apps/web (18 matches)
  ✱ Glob "hooks/_.ts" in frontend/apps/web (3 matches)
  ✱ Glob "contexts/\*\*/_.tsx" in frontend/apps/web
  Ahora voy a explorar la app antigua.
  ✱ Glob "app/**/page.tsx" in frontend/apps/test/frontend/apps/web (20 matches)
  ✱ Glob "app/**/layout.tsx" in frontend/apps/test/frontend/apps/web (3 matches)
  ✱ Glob "app/**/error.tsx" in frontend/apps/test/frontend/apps/web (1 match)
  ✱ Glob "app/**/not-found.tsx" in frontend/apps/test/frontend/apps/web (1 match)
  ✱ Glob "app/**/loading.tsx" in frontend/apps/test/frontend/apps/web (3 matches)
  ✱ Glob "components/**/_.tsx" in frontend/apps/test/frontend/apps/web (100 matches)
  ✱ Glob "lib/managers/_.ts" in frontend/apps/test/frontend/apps/web
  ✱ Glob "hooks/_.ts" in frontend/apps/test/frontend/apps/web (4 matches)
  Ahora necesito leer el contenido de cada página en detalle. Empezaré por las páginas de la app nueva y luego las de la antigua.
  → Read frontend/apps/web/app/(protected)/(app)/page.tsx
  → Read frontend/apps/web/app/(protected)/(app)/library/page.tsx
  → Read frontend/apps/web/app/(protected)/(app)/search/page.tsx
  → Read frontend/apps/web/app/(protected)/(app)/settings/page.tsx
  → Read frontend/apps/web/app/(protected)/(app)/downloader/page.tsx
  → Read frontend/apps/web/app/(protected)/(app)/stats/page.tsx
  → Read frontend/apps/web/app/(protected)/(app)/radio/page.tsx
  → Read frontend/apps/web/app/(protected)/(app)/friends/page.tsx
  → Read frontend/apps/web/app/(protected)/(app)/admin/page.tsx
  → Read frontend/apps/web/app/(protected)/(app)/playlist/[publicId]/page.tsx
  → Read frontend/apps/web/app/login/page.tsx
  → Read frontend/apps/web/app/register/page.tsx
  Ahora leo las páginas de la app antigua.
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/library/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/search/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/settings/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/downloader/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/stats/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/radio/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/friends/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/playlist/[publicId]/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/album/[publicId]/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/artist/[id]/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/song/[publicId]/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/login/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/register/page.tsx
  Ahora voy a leer los componentes clave de ambas apps para entender las features implementadas.
  → Read frontend/apps/web/components/Home/HomeClient.tsx
  → Read frontend/apps/test/frontend/apps/web/components/Home/HomeClient.tsx
  → Read frontend/apps/web/components/Library/LibraryClient.tsx
  → Read frontend/apps/test/frontend/apps/web/components/Library/LibraryClient.tsx
  → Read frontend/apps/web/components/Settings/SettingsClient.tsx
  → Read frontend/apps/test/frontend/apps/web/components/Settings/SettingsClient.tsx
  → Read frontend/apps/web/components/Search/Search.tsx
  → Read frontend/apps/test/frontend/apps/web/components/Search/Search.tsx
  Ahora voy a leer los componentes adicionales de la app antigua que no existen en la nueva.
  → Read frontend/apps/test/frontend/apps/web/components/Stats/StatsClient.tsx
  → Read frontend/apps/test/frontend/apps/web/components/Downloader/DownloaderClient.tsx
  → Read frontend/apps/test/frontend/apps/web/components/Radio/RadioClient.tsx
  → Read frontend/apps/test/frontend/apps/web/components/SongPage/SongPageCover.tsx
  → Read frontend/apps/test/frontend/apps/web/components/SongPage/SongPageAlbum.tsx
  → Read frontend/apps/test/frontend/apps/web/components/SongPage/SongPageLyrics.tsx
  → Read frontend/apps/test/frontend/apps/web/components/SongPage/SongPageTopArtistSongs.tsx
  → Read frontend/apps/test/frontend/apps/web/components/Downloader/DownloadInputBar.tsx
  → Read frontend/apps/test/frontend/apps/web/components/Downloader/DownloadLiveFeed.tsx
  Ahora voy a leer más componentes de la app antigua y verificar qué páginas adicionales existen (Spotify, YouTube, etc).
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/spotify/track/[spotifyId]/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/spotify/album/[spotifyId]/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/spotify/artist/[spotifyId]/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/spotify/playlist/[spotifyId]/page.tsx
  → Read frontend/apps/test/frontend/apps/web/app/(protected)/(app)/youtube/video/[youtubeId]/page.tsx
  → Read frontend/apps/test/frontend/apps/web/components/Stats/UserStats.tsx
  → Read frontend/apps/web/components/Admin/AdminClient.tsx
  Ahora voy a verificar qué páginas/rutas existen en la app nueva que podrían faltar (album, artist, song).
  ✱ Glob "app/(protected)/(app)/album/\*\*/_" in frontend/apps/web
  ✱ Glob "app/(protected)/(app)/artist/**/\*" in frontend/apps/web
  ✱ Glob "app/(protected)/(app)/song/**/_" in frontend/apps/web
  ✱ Glob "app/(protected)/(app)/spotify/\*\*/_" in frontend/apps/web
  ✱ Glob "app/(protected)/(app)/youtube/**/\*" in frontend/apps/web
  ✱ Glob "app/(protected)/(app)/test-video/**/_" in frontend/apps/test/frontend/apps/web (2 matches)
  → Read frontend/apps/test/frontend/apps/web/components/Friends/FriendsClient.tsx
  Ahora verifiquemos algunas cosas más de la app antigua que no están en la nueva.
  ✱ Glob "components/Spotify/_.tsx" in frontend/apps/test/frontend/apps/web (4 matches)
  ✱ Glob "components/Spotify/_.tsx" in frontend/apps/web
  ✱ Glob "components/Youtube/_.tsx" in frontend/apps/test/frontend/apps/web (1 match)
  ✱ Glob "components/Youtube/_.tsx" in frontend/apps/web
  ✱ Glob "components/Stats/\*\*/_.tsx" in frontend/apps/test/frontend/apps/web (8 matches)
  ✱ Glob "components/Stats/**/\*.tsx" in frontend/apps/web
  ✱ Glob "components/Downloader/**/_.tsx" in frontend/apps/test/frontend/apps/web (3 matches)
  ✱ Glob "components/Downloader/\*\*/_.tsx" in frontend/apps/web
  ✱ Glob "components/SongPage/**/\*.tsx" in frontend/apps/test/frontend/apps/web (4 matches)
  ✱ Glob "components/SongPage/**/_.tsx" in frontend/apps/web
  ✱ Glob "components/Radio/\*\*/_.tsx" in frontend/apps/test/frontend/apps/web (1 match)
  ✱ Glob "components/Radio/**/\*.tsx" in frontend/apps/web
  ✱ Glob "components/Home/**/_.tsx" in frontend/apps/test/frontend/apps/web (6 matches)
  ✱ Glob "components/Home/\*\*/_.tsx" in frontend/apps/web (1 match)
  Voy a verificar algunos archivos más de la app antigua para completar la comparación.
  ✱ Glob "components/Masonry/_.tsx" in frontend/apps/test/frontend/apps/web (1 match)
  ✱ Glob "components/List/_.tsx" in frontend/apps/test/frontend/apps/web (1 match)
  ✱ Glob "components/ListHeader/_.tsx" in frontend/apps/test/frontend/apps/web (4 matches)
  ✱ Glob "components/RenderList/\*\*/_.tsx" in frontend/apps/test/frontend/apps/web (2 matches)
  ✱ Glob "components/RenderList/\*_/_.tsx" in frontend/apps/web (4 matches)
  ✱ Glob "components/Friends/_.tsx" in frontend/apps/test/frontend/apps/web (1 match)
  ✱ Glob "components/Test/_.tsx" in frontend/apps/test/frontend/apps/web (1 match)

---

Goal
The user wants to complete the web app pages of their Rockit music player project. They migrated from a monolithic React app to a new architecture separating mobile (Expo) from web (Next.js). The task is to compare the old web app (at frontend/apps/test/frontend/apps/web) with the new web app (at frontend/apps/web), identify what's implemented and what's missing page-by-page at the feature level, then rebuild/reimplement each page cleanly from scratch.
Instructions

- Go page by page — the user explicitly wants detailed per-page analysis
- Clean and rewrite absolutely all code — not port the old code, but use it as reference
- The user wants to proceed step by step, completing one page at a time
- Follow all project conventions from the docs (AGENTSfrontend.md, AGENTSbackend.md, Rules.md, etc.)
  Discoveries
  Project Architecture
- Backend: FastAPI (async), SQLAlchemy, PostgreSQL, 3-layer architecture (controllers → framework → access), AResult pattern, 5 businesses (core, default, spotify, youtube, rockit), providers system
- Frontend Web: Next.js 16 App Router, TypeScript, Nanostores, Zod, Tailwind CSS v4, pnpm monorepo
- Frontend Mobile: Expo (React Native), separate app at frontend/apps/mobile/
- Key rule: page.tsx NEVER has "use client" — Server Components only. Client logic in \*Client.tsx
- Key rule: All business logic in Managers (lib/managers/), never in components
- Key rule: DTOs auto-generated from backend via python3 -m backend zod — NEVER edit manually
- Old app uses @/packages/lib/... and @/packages/dto imports; new app uses @/lib/... and @/dto
- Old app has no enums (uses string literals like "default" | "asc" | "desc"); new app has proper enums in @/models/enums/
  Page-by-Page Comparison (NEW vs OLD)

1. / (Home)

- NEW: HomeClient just does router.push("/library") — completely empty, no home content
- OLD: Full home page with useHomeData hook, QuickSelectionsSection, SongScrollSection sections (Recently Played, Hidden Gems, Community Top, Monthly Recap), vocabulary/i18n, loading state with Spinner, server-side getHomeStats() with HomeStatsResponseSchema validation and revalidate: 60
- MISSING in new: Entire home content — stats fetching, QuickSelections, SongScroll sections, RecentlyPlayedSong, SongsCarousel, useHomeData hook, sections components

2. /library

- NEW: Fully implemented with LibraryClient — filters (EContentType, EFilterMode enums), view toggle (grid/list), sort cycling, search, upload modal, desktop+mobile headers. Nearly identical to old.
- OLD: Same structure but uses string literals instead of enums. Has isLoading skeleton in ProfileSidebar.
- DIFF: Old has isLoading state in useSettingsUser; new removed it. Old uses ContentType from hook; new uses EContentType enum. Otherwise functionally equivalent.

3. /search

- NEW & OLD: Identical implementation — SearchBarInput, sections (Songs, Albums, Artists, Playlists, Videos), RadioSection commented out in both, useSearchResults hook, empty state with logo
- STATUS: Fully implemented, no changes needed

4. /settings

- NEW & OLD: Nearly identical — ProfileSidebar, DisplayNameInput, PasswordSection, ChangeLang, CrossFadeInput, DownloadAppButton, ServiceWorkerInfo, LogOutButton
- DIFF: Old has isLoading skeleton states in ProfileSidebar and DisplayNameInput; new removes those. Otherwise same.

5. /playlist/[publicId]

- NEW & OLD: Nearly identical — cache(), generateMetadata(), getPlaylistAsync(), RenderListClient
- DIFF: Old has hardcoded imageBlur URL; new removes it. Otherwise same.

6. /downloader

- NEW: Shows WorkInProgress placeholder — completely empty
- OLD: Full implementation — DownloaderClient with URL input bar (DownloadInputBar), live download feed with grouped items (Active/Completed/Failed), donut chart sidebar, stats pills, clear completed button, sources card, useDownloadGroups hook, DownloadLiveFeed with collapsible groups and per-item metadata fetching, useMediaMeta hook
- MISSING in new: Entire downloader — all components (DownloaderClient, DownloadInputBar, DownloadLiveFeed), donut chart, stats sidebar, progress bars, WebSocket integration

7. /stats

- NEW: Shows WorkInProgress placeholder — completely empty
- OLD: Full implementation — StatsClient with tabs (User/General/Friends), date range selector (7d/30d/1y/custom), UserStats component with summary cards (songs played, minutes listened, avg min/song, day streak), MinutesBarChart (Recharts), RankingList (top songs, top artists), AlbumGrid (top albums), ListeningHeatmap, mock data currently but designed for real API integration
- MISSING in new: Entire stats page — StatsClient, UserStats, all chart components (MinutesBarChart, RankingList, AlbumGrid, ListeningHeatmap, BarGraph, VerticalBarGraph), mock data, date range picker

8. /radio

- NEW: Shows WorkInProgress placeholder — completely empty
- OLD: Full implementation — RadioClient with search input (debounced), station cards with cover/favicon/proxy, play station via rockIt.stationManager, current station indicator with ping animation, empty state, loading skeleton, grid layout, Station type
- MISSING in new: Entire radio page — RadioClient, station search, station cards, playback integration

9. /friends

- NEW: Shows WorkInProgress placeholder — completely empty
- OLD: Page exists but FriendsClient is entirely commented out — was a 3-column layout with level circle, shared songs feed, and friends list with pending requests
- STATUS: Neither app has working friends page. Old had commented-out code. Both are effectively empty.

10. /admin

- NEW: Fully implemented — server-side auth check (admin flag), fetches builds via apiFetch, AdminClient with tabs (Builds/Users/Settings), chunked APK upload with progress, builds list, delete button, full vocabulary integration
- OLD: Does not exist (no admin page)
- STATUS: New-only feature, fully implemented

11. /album/[publicId] — MISSING IN NEW

- OLD: Full implementation — cache(), generateMetadata() with OpenGraph, getAlbumAsync(), songs sorted by trackNumber, RenderList component with showMediaIndex, imageBlur
- MISSING in new: Entire album page route and components

12. /artist/[id] — MISSING IN NEW

- OLD: Full implementation — artist page with background image, artist name heading, Top Songs list, Top Albums list, Albums & Singles horizontal scroll, Related Artists horizontal scroll, placeholder data for missing API responses
- MISSING in new: Entire artist page route and components. Note: old uses [id] not [publicId] and has raw HTML/styling that needs clean rewrite.

13. /song/[publicId] — MISSING IN NEW

- OLD: Full implementation — generateMetadata() with OG + Twitter cards, 3-column layout (artist card | song cover | album card), SongPageCover with play/download icon overlay, LikeButton, SongPopupMenu, LyricsSection (stub), SongPageAlbum (shows album tracks), mobile responsive
- MISSING in new: Entire song page route, SongPageCover, SongPageAlbum, SongPageLyrics, SongPageTopArtistSongs components

14. /spotify/\* routes — MISSING IN NEW

- OLD: /spotify/track/[spotifyId], /spotify/album/[spotifyId], /spotify/artist/[spotifyId], /spotify/playlist/[spotifyId] — each with dedicated Spotify client components (SpotifyTrackClient, SpotifyAlbumClient, SpotifyArtistClient, SpotifyPlaylistClient)
- MISSING in new: All Spotify-specific routes and components

15. /youtube/video/[youtubeId] — MISSING IN NEW

- OLD: YouTube video page with YoutubeVideoClient component
- MISSING in new: YouTube video route and component

16. /test-video/[youtube_video_id] — OLD ONLY

- Test page, likely not needed in new app

17. /login and /register

- NEW & OLD: Identical — background image + modal (LoginModal/RegisterModal)
- STATUS: Fully implemented, no changes needed
  Component Groups Missing in New App (entirely absent)
- components/Stats/ — all chart components
- components/Downloader/ — DownloadInputBar, DownloadLiveFeed, DownloaderClient
- components/Radio/ — RadioClient
- components/SongPage/ — SongPageCover, SongPageAlbum, SongPageLyrics, SongPageTopArtistSongs
- components/Spotify/ — Artist, Album, Playlist, Track
- components/Youtube/ — Video
- components/Home/sections/ — QuickSelectionsSection, SongScrollSection
- components/Home/ extras — RecentlyPlayedSong, SongsCarousel, QuickSelectionsSong, hooks/useHomeData
- components/Masonry/ — Masonry
- components/List/ — ListCover
- components/ListHeader/ — PlayListButton, DownloadListButton, DownloadAnimation, ListOptions
- components/Friends/ — FriendsClient (commented out)
- components/Test/ — TestClient
  New App Has But Old Doesn't
- components/Admin/ — AdminClient (fully implemented)
- components/WorkInProgress/ — WorkInProgress placeholder
- components/DropOverlay/ — DropOverlay
- components/MediaContextMenu/ — GenericContextMenu, MediaContextMenu
- components/PopupMenus/ — MediaPopupMenu, SongPopupMenu
- components/PlayerUI/AutoPlay.tsx
- components/PiP/ — PiPRoot, PiPCover, PiPControls, PiPInfo, PiPProgress
- models/enums/ — proper TypeScript enums (EContentType, EFilterMode, EViewMode, EAdminClientTab)
- lib/managers/ — 18 managers including indexedDBManager, serviceWorkerManager, stationManager, listManager, currentListManager, authManager
  Accomplished
- Read all 9 project documentation files to understand architecture and conventions
- Read every page.tsx in both old and new apps
- Read key component files in both apps to understand feature implementation depth
- Identified all missing pages, components, and features
- No implementation work has been started yet — the user wants to go page by page
  Work Still To Do (ordered by page)

1. / (Home) — Rebuild with stats fetch, QuickSelections, SongScroll sections, useHomeData
2. /downloader — Rebuild with DownloaderClient, input bar, live feed, donut chart, stats
3. /stats — Rebuild with StatsClient, UserStats, charts (MinutesBarChart, RankingList, AlbumGrid, Heatmap)
4. /radio — Rebuild with RadioClient, station search, station cards, playback
5. /album/[publicId] — Create new route + page with RenderList
6. /artist/[id] — Create new route + page with artist detail UI
7. /song/[publicId] — Create new route + page with cover, lyrics, album tracks
8. /spotify/\* — Create Spotify-specific routes if still needed (may be handled by unified provider system)
9. /youtube/video/[youtubeId] — Create YouTube video route if still needed
10. /friends — Rebuild when backend friends API is ready (currently empty in both)
11. /library — Minor: add back isLoading skeleton states
12. /settings — Minor: add back isLoading skeleton states
    Relevant files / directories
    New app (the target to build into)

- /home/nicorebo18/rockit/frontend/apps/web/app/ — all page routes
- /home/nicorebo18/rockit/frontend/apps/web/components/ — all components
- /home/nicorebo18/rockit/frontend/apps/web/lib/managers/ — 18 managers
- /home/nicorebo18/rockit/frontend/apps/web/hooks/ — useFetch, useMedia, useWindowSize
- /home/nicorebo18/rockit/frontend/apps/web/models/enums/ — TypeScript enums
- /home/nicorebo18/rockit/frontend/apps/web/components/RenderList/ — shared list component (RenderList.tsx, RenderListClient.tsx, Media.tsx, PlayableMedia.tsx)
  Old app (reference for features)
- /home/nicorebo18/rockit/frontend/apps/test/frontend/apps/web/app/ — all old page routes
- /home/nicorebo18/rockit/frontend/apps/test/frontend/apps/web/components/Stats/ — StatsClient, UserStats, charts/ (RankingList, ListeningHeatmap, AlbumGrid, MinutesBarChart)
- /home/nicorebo18/rockit/frontend/apps/test/frontend/apps/web/components/Downloader/ — DownloaderClient, DownloadInputBar, DownloadLiveFeed
- /home/nicorebo18/rockit/frontend/apps/test/frontend/apps/web/components/Radio/ — RadioClient
- /home/nicorebo18/rockit/frontend/apps/test/frontend/apps/web/components/SongPage/ — SongPageCover, SongPageAlbum, SongPageLyrics, SongPageTopArtistSongs
- /home/nicorebo18/rockit/frontend/apps/test/frontend/apps/web/components/Spotify/ — Artist, Album, Playlist, Track
- /home/nicorebo18/rockit/frontend/apps/test/frontend/apps/web/components/Youtube/ — Video
- /home/nicorebo18/rockit/frontend/apps/test/frontend/apps/web/components/Home/ — HomeClient, sections/, RecentlyPlayedSong, SongsCarousel, QuickSelectionsSong, hooks/useHomeData
- /home/nicorebo18/rockit/frontend/apps/test/frontend/apps/web/components/Friends/ — FriendsClient (commented out)
- /home/nicorebo18/rockit/frontend/apps/test/frontend/apps/web/components/RenderList/ — RenderList, RenderListClient
  Project docs
- /home/nicorebo18/rockit/docs/AGENTSfrontend.md — frontend conventions
- /home/nicorebo18/rockit/docs/AGENTSbackend.md — backend conventions
- /home/nicorebo18/rockit/docs/Rules.md — project rules
- /home/nicorebo18/rockit/docs/CONTRIBUTING.md — contributing guide
- /home/nicorebo18/rockit/docs/FRONTENDmigration.md — mobile migration guide
- /home/nicorebo18/rockit/docs/FRONTENDsetup.md — setup guide
- /home/nicorebo18/rockit/docs/DOCKER.md — Docker guide
- /home/nicorebo18/rockit/docs/EXPOdocs.md — Expo basics
- /home/nicorebo18/rockit/docs/BUILDINGAPKIPA.md — mobile build guide
  ▣ Compaction · GLM-5.1 · 4m 29s
  Based on the summary, the next step is to start implementing the missing pages. The first one in order is the Home page (/). Let me gather the specific details needed to write a solid plan for it.
  │ Explore Task — Explore Home page details
  └ 93 toolcalls · 14m 41s
  ctrl+x down view subagents
  Now I have all the details. Here's the plan for the Home page (/) rewrite:

---

Home Page Implementation Plan
Architecture
page.tsx (Server Component)
└─ fetches /stats/home server-side with revalidate: 60
└─ passes initialStats to HomeClient
HomeClient.tsx ("use client")
└─ uses useHomeData hook (falls back to initialStats, then client-side useFetch)
└─ redirects to /library if empty
└─ renders 7 sections:

1. QuickSelectionsSection ← randomSongsLastMonth (compact grid cards)
2. SongScrollSection ← songsByTimePlayed ("Recently Played")
3. SongScrollSection ← nostalgicMix ("Nostalgic Mix")
4. SongScrollSection ← hiddenGems ("Hidden Gems")
5. SongScrollSection ← communityTop ("Community Top")
6. SongScrollSection ← monthlyTop ("{Month} Recap")
7. SongScrollSection ← moodSongs ("Mood Songs")
   Files to Create/Modify
   Action File
   Modify app/(protected)/(app)/page.tsx
   Rewrite components/Home/HomeClient.tsx
   Create components/Home/hooks/useHomeData.ts
   Create components/Home/sections/QuickSelectionsSection.tsx
   Create components/Home/sections/SongScrollSection.tsx
   Create components/Home/QuickSelectionsSong.tsx
   Create components/Home/RecentlyPlayedSong.tsx
   Create components/Home/index.ts
   Key Decisions to Make

# Questions

The backend provides 7 song arrays but the old frontend only used 5 (skipped nostalgicMix and moodSongs). Should we display all 7 sections including Nostalgic Mix and Mood Songs?
Yes, all 7 (Recommended)
For the QuickSelectionsSong click behavior, the old app used songHandleClick + SongContextMenu which don't exist in the new app. The new app's pattern is queueManager.setMedia() + moveToMedia() + play(). Should we add right-click MediaContextMenu support to QuickSelectionsSong?
Yes, add MediaContextMenu (Recommended)
The old app redirected to /library when all sections were empty. Should we keep that behavior or show an empty state on the Home page?
Redirect to /library (Recommended)
Good. Let me also check one more thing about the existing MediaContextMenu and how songs are played in the new app:
│ Explore Task — Check MediaContextMenu and playback
└ 32 toolcalls · 15m 57s
ctrl+x down view subagents
Now I have everything needed. Let me also quickly check the server-side fetch pattern used in other pages of the new app, to make sure the Home page server fetch follows the same pattern:
✱ Grep "credentials.*include|next.*revalidate|apiFetch.\*server|getServerSession|getUserInServer" in frontend/apps/web/app (2 matches)
→ Read frontend/apps/web/app/(protected)/(app)/admin/page.tsx
→ Read frontend/apps/web/app/(protected)/(app)/playlist/[publicId]/page.tsx
→ Read frontend/apps/web/lib/getUserInServer.ts
→ Read frontend/apps/web/lib/services/mediaService.ts
Now I have the complete picture. Here's the final plan:

---

Home Page — Complete Implementation Plan

1. app/(protected)/(app)/page.tsx (Server Component)

- Use apiFetch with HomeStatsResponseSchema (same pattern as admin page)
- Add cache() wrapper with revalidate: 60 for ISR
- Pass initialStats to HomeClient

2. components/Home/HomeClient.tsx ("use client")

- Accept initialStats?: HomeStatsResponse | null prop
- Use useHomeData(initialStats) hook for client-side refresh
- Compute previous month key with useSyncExternalStore (hydration-safe)
- If data is empty → router.push("/library") (confirmed: redirect to /library)
- If loading → skeleton placeholders
- Render 7 sections (confirmed: all 7):
    1. QuickSelectionsSection ← randomSongsLastMonth
    2. SongScrollSection ← songsByTimePlayed ("Recently Played")
    3. SongScrollSection ← nostalgicMix ("Nostalgic Mix")
    4. SongScrollSection ← hiddenGems ("Hidden Gems")
    5. SongScrollSection ← communityTop ("Community Top")
    6. SongScrollSection ← monthlyTop ("{Month} Recap")
    7. SongScrollSection ← moodSongs ("Mood Songs")

3. components/Home/hooks/useHomeData.ts

- Uses new useFetch (returns { data, update, loading, error })
- Falls back to initialStats from SSR
- transformStats maps response → HomeData with 7 arrays + isEmpty
- Type: all arrays are BaseSongWithAlbumResponse[]

4. components/Home/sections/QuickSelectionsSection.tsx

- Same layout as old: 10 columns × 4 rows, horizontal snap scroll
- Mobile: 51% width columns; Desktop: 25% width columns
- Each song rendered as QuickSelectionsSong

5. components/Home/sections/SongScrollSection.tsx

- Horizontal overflow scroll with gap-4
- Each song rendered as RecentlyPlayedSong
- Type: BaseSongWithAlbumResponse[] (fixed old type mismatch)
- className prop for spacing variation

6. components/Home/QuickSelectionsSong.tsx ("use client")

- Compact row: 48px thumbnail + song name + "artist • album"
- Click → rockIt.queueManager.setMedia(), moveToMedia(), play() (new app pattern)
- Wrapped in MediaContextMenu (confirmed: add right-click context menu)
- Uses useMedia hook for download state updates

7. components/Home/RecentlyPlayedSong.tsx ("use client")

- Card: cover image + song name + clickable artist name
- Click → same queue play pattern
- Artist click → router.push(/artist/{publicId})
- Uses useMedia hook

8. components/Home/index.ts

- Barrel exports for all Home components
  Vocabulary Notes
- QUICK_SELECTIONS, RECENTLY_PLAYED, HIDDEN_GEMS, COMMUNITY_TOP, MOOD_SONGS — all exist in vocabulary
- Month names (JANUARY-DECEMBER) — all exist
- NOSTALGIC_MIX — missing from vocabulary types. The proxy returns the key itself as fallback, so it will display "NOSTALGIC_MIX" until added to the backend DB. We should add it but it won't block the implementation.
  Implementation Order

1. Create useHomeData.ts hook
2. Create RecentlyPlayedSong.tsx
3. Create QuickSelectionsSong.tsx
4. Create SongScrollSection.tsx
5. Create QuickSelectionsSection.tsx
6. Rewrite HomeClient.tsx
7. Update page.tsx with server-side fetch
8. Create index.ts barrel
9. Run pnpm lint and npx tsc --noEmit to verify
