# Rockit — Agent Guidelines

> Read this file before making any change. It covers architecture, conventions,
> patterns and API routes for both frontend and backend.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Running the Project](#2-running-the-project)
3. [Backend Architecture](#3-backend-architecture)
4. [Backend API Routes](#4-backend-api-routes)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Frontend ↔ Backend Contract](#6-frontend--backend-contract)
7. [Implementing New Features — Full Stack](#7-implementing-new-features--full-stack)
8. [Code Conventions](#8-code-conventions)
9. [Things to Never Do](#9-things-to-never-do)
10. [Key Files Reference](#10-key-files-reference)

---

## 1. Project Overview

Rockit is a self-hosted music player.

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Nanostores, Zod, Recharts |
| Backend | FastAPI (async), SQLAlchemy (async), asyncpg, PostgreSQL |
| External APIs | Spotipy (Spotify), yt-dlp (YouTube) |

```
rockit/
├── frontend/    # Next.js app
└── backend/     # FastAPI app
```

---

## 2. Running the Project

### Backend

```bash
cd backend

# Development server
uvicorn backend.core.main:app --reload

# Type checking
venv/bin/python -m pyright

# Linting / formatting
venv/bin/python -m black <file>

# Initialize database
python3 -m backend init-db

# Generate frontend DTOs from backend responses
python3 -m backend zod
```

### Frontend

```bash
cd frontend

# Development (Turbopack)
pnpm dev

# Build
pnpm build

# Lint
pnpm lint

# Type check
npx tsc --noEmit
```

---

## 3. Backend Architecture

### 3.1 Directory Structure

```
backend/
├── __main__.py                    # CLI entry (commands: zod, init-db)
├── constants.py                   # Environment variables
│
├── core/                          # Shared functionality
│   ├── controllers/               # HTTP endpoints
│   │   ├── authController.py      # Login, register, logout
│   │   ├── userController.py      # User management
│   │   ├── mediaController.py     # Songs, albums, artists
│   │   ├── downloadController.py  # Downloads
│   │   ├── wsController.py        # WebSocket
│   │   └── statsController.py     # User stats
│   ├── framework/                 # Business logic
│   │   ├── auth/
│   │   │   ├── password.py        # Hash / verify passwords
│   │   │   └── session.py         # Session creation / destruction
│   │   ├── media/                 # Media operations
│   │   ├── downloader/            # Download management
│   │   ├── provider/
│   │   │   ├── baseProvider.py    # Abstract provider interface
│   │   │   └── providers.py       # Provider discovery & registry
│   │   └── websocket/             # WebSocket manager
│   ├── access/                    # Database operations
│   │   ├── db/
│   │   │   ├── ormModels/         # SQLAlchemy ORM models
│   │   │   ├── ormEnums/          # Enum table definitions
│   │   │   ├── rockItDb.py        # DB connection manager
│   │   │   └── base.py            # SQLAlchemy base
│   │   ├── userAccess.py
│   │   ├── mediaAccess.py
│   │   └── statsAccess.py
│   ├── middlewares/
│   │   ├── dbSessionMiddleware.py # Session-per-request
│   │   └── authMiddleware.py      # Auth + session cookies
│   ├── responses/                 # Pydantic output models
│   ├── requests/                  # Pydantic input models
│   └── aResult.py                 # Result wrapper
│
├── default/                       # User playlists
│   ├── controllers/
│   ├── framework/
│   ├── access/
│   ├── responses/
│   └── requests/
│
├── spotify/                       # Spotify integration
│   ├── controllers/spotifyController.py
│   ├── framework/
│   │   ├── spotify.py
│   │   ├── spotifyApi.py
│   │   └── provider/spotifyProvider.py
│   ├── access/spotifyAccess.py
│   ├── responses/
│   └── requests/
│
├── youtube/                       # YouTube integration
│   ├── controllers/
│   ├── framework/
│   │   └── provider/youtubeProvider.py
│   └── access/
│
└── rockit/                        # User-uploaded music
    ├── framework/provider/rockitProvider.py
    └── access/
```

### 3.2 Layer Architecture

```
controllers/  →  framework/  →  access/
   (HTTP)        (Logic)        (DB)
```

| Layer | Does | Must NOT do |
|-------|------|-------------|
| **controllers/** | Parse HTTP, validate with Pydantic, call framework, raise HTTPException | Call access directly, return dicts |
| **framework/** | Business logic, orchestrate calls, apply rules | Call controllers, raise HTTPException, use raw SQL |
| **access/** | SQLAlchemy CRUD, return ORM models | Call framework, contain business logic |

Folder naming: `controllers/` (plural), `framework/` (singular), `access/` (singular).

### 3.3 AResult Pattern

All framework and access functions return `AResult`, never raise exceptions internally.

```python
from backend.core.aResult import AResult, AResultCode

class AResultCode:
    OK            = 0x1
    GENERAL_ERROR = 0x2
    NOT_FOUND     = 0x3
    BAD_REQUEST   = 0x4
    NOT_IMPLEMENTED = 0x5
    ALREADY_EXISTS  = 0x6
    VALIDATION_ERROR = 0x7
```

```python
# Framework/access — return AResult
async def get_user_async(session: AsyncSession, user_id: int) -> AResult[UserRow]:
    """Get a user by their internal ID."""

    a_result: AResult[UserRow] = await UserAccess.get_user_from_id_async(
        session=session, user_id=user_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting user. {a_result.info()}", exc_info=True)
        return AResult(code=a_result.code(), message=a_result.message())

    return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

# Controller — only place that raises HTTPException
@router.get("/user/{user_id}")
async def get_user(request: Request, user_id: int) -> UserResponse:
    """Get user by ID endpoint."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result = await UserFramework.get_user_async(session=session, user_id=user_id)

    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message()
        )
    return a_result.result()
```

| AResultCode | HTTP |
|-------------|------|
| OK | 200 |
| ALREADY_EXISTS | 200 |
| NOT_FOUND | 404 |
| BAD_REQUEST | 400 |
| GENERAL_ERROR | 500 |
| NOT_IMPLEMENTED | 501 |

### 3.4 Database

```python
# Connection manager — backend/core/access/db/rockItDb.py
rockit_db = RockItDB(username, password, host, port, database)

# Transaction scope (auto commit/rollback)
async with rockit_db.session_scope_async() as session:
    result = await SomeAccess.do_something(session=session)
```

**Session per request** — `DBSessionMiddleware` injects `request.state.db` for every HTTP request. Controllers retrieve it via:

```python
session: AsyncSession = DBSessionMiddleware.get_session(request=request)
```

**ORM model example:**

```python
class UserRow(CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded):
    __tablename__ = "user"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    username: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
```

| Mixin | Adds |
|-------|------|
| `TableAutoincrementId` | `id` (PK, internal only, NEVER send to client) |
| `TablePublicId` | `public_id` (UUID string, use for all client API) |
| `TableDateUpdated` | `date_updated` |
| `TableDateAdded` | `date_added` |

### 3.5 Authentication

```python
# Get current user in controller
a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)

# Protect an endpoint
@router.get("/protected")
async def protected_endpoint(
    request: Request,
    _=Depends(AuthMiddleware.auth_dependency),
):
    ...
```

### 3.6 Providers System

Providers abstract multiple music sources (Spotify, YouTube, RockIt).

```python
# backend/core/framework/provider/baseProvider.py
class BaseProvider:
    async def search_async(self, query: str) -> AResult[List[BaseSearchResultsItem]]
    async def get_song_async(self, session, public_id: str) -> AResult[BaseSongWithAlbumResponse]
    async def get_album_async(self, session, public_id: str) -> AResult[BaseAlbumWithSongsResponse]
    async def get_artist_async(self, session, public_id: str) -> AResult[BaseArtistResponse]
    async def get_playlist_async(self, session, user_id, public_id) -> AResult[BasePlaylistResponse]
    async def get_video_async(self, session, public_id: str) -> AResult[BaseVideoResponse]
    async def start_download_async(self, session, public_id, download_id, download_group_id, user_id) -> AResult[BaseDownload]
    def match_url(self, url: str) -> str | None  # External URL → internal path
```

To add a provider: create `backend/{name}/framework/provider/provider.py` implementing `BaseProvider`, export `provider = MyProvider()` and `name = "ProviderName"`.

---

## 4. Backend API Routes

These are the known routes. Use `public_id` for all resource identifiers.

### Auth — `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login with username/password → sets session cookie |
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/logout` | Yes | Destroy session |

### Session — `/session`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/session` | Yes | Get current session info (user data) |

### User — `/user`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/user` | Yes | Get current user profile |
| PATCH | `/user/lang` | Yes | Set language preference |
| PATCH | `/user/crossfade` | Yes | Set crossfade seconds |
| PATCH | `/user/random-queue` | Yes | Toggle random queue |
| PATCH | `/user/repeat-mode` | Yes | Cycle repeat mode |
| GET | `/user/vocabulary` | Yes | Get i18n vocabulary for current lang |

### Media — `/media`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/media/search?q=` | Yes | Search across all providers |
| GET | `/media/url/match?url=` | Yes | Match external URL to internal path |
| GET | `/media/liked` | Yes | Get liked media list |
| POST | `/media/like` | Yes | Like/unlike a media item |

### Song — `/song`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/song/{publicId}` | Yes | Get song by public ID |
| GET | `/song/{publicId}?q=name,image,...` | Yes | Get song with specific fields |

### Album — `/album`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/album/{publicId}` | Yes | Get album with songs |

### Artist — `/artist`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/artist/{id}` | Yes | Get artist info + top songs |

### Playlist — `/playlist`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/playlist/{publicId}` | Yes | Get playlist with songs |
| POST | `/playlist` | Yes | Create new playlist |
| PATCH | `/playlist/{publicId}` | Yes | Update playlist |
| DELETE | `/playlist/{publicId}` | Yes | Delete playlist |
| POST | `/playlist/{publicId}/song` | Yes | Add song to playlist |
| DELETE | `/playlist/{publicId}/song/{songId}` | Yes | Remove song from playlist |

### Library — `/library`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/library` | Yes | Get all user library lists (playlists, albums, etc.) |

### Downloads — `/downloads`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/downloads/start` | Yes | Start a download (Spotify/YouTube URL) |
| GET | `/downloads` | Yes | Get all user downloads |
| POST | `/downloads/mark-seen/{publicId}` | Yes | Mark download as seen |

### Stats — `/stats`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats/home` | Yes | Home page stats (recently played, etc.) |
| GET | `/stats/user?range=7d` | Yes | User listening stats (songs, minutes, top lists) |

### Spotify — `/spotify`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/spotify/track/{spotifyId}` | Yes | Get Spotify track info |
| GET | `/spotify/album/{spotifyId}` | Yes | Get Spotify album info |
| GET | `/spotify/artist/{spotifyId}` | Yes | Get Spotify artist info |
| GET | `/spotify/playlist/{spotifyId}` | Yes | Get Spotify playlist |

### Vocabulary — `/vocabulary`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/vocabulary` | Yes | Get list of available languages |

### WebSocket — `/ws`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| WS | `/ws` | Yes | Real-time: queue updates, download progress, playback sync |

**WebSocket message types sent by backend:**
- `download_progress` — `{ publicId, completed, message }`
- `current_queue` — full queue snapshot
- `current_media` — currently playing media
- `current_time` — playback position sync

---

## 5. Frontend Architecture

### 5.1 Directory Structure

```
frontend/
├── app/
│   ├── (protected)/
│   │   ├── (app)/              # All main app pages
│   │   │   ├── page.tsx        # Home (Server Component)
│   │   │   ├── library/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   ├── playlist/[publicId]/page.tsx
│   │   │   ├── album/[publicId]/page.tsx
│   │   │   ├── artist/[id]/page.tsx
│   │   │   ├── song/[publicId]/page.tsx
│   │   │   ├── downloader/page.tsx
│   │   │   ├── stats/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── layout.tsx          # Auth check
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── not-found.tsx
│
├── components/                 # Feature-based components
│   ├── [Feature]/
│   │   ├── [Feature]Client.tsx # "use client" wrapper
│   │   ├── hooks/
│   │   │   └── use[Feature].ts
│   │   └── index.ts            # Barrel export (required)
│   └── Layout/
│       └── AppClientLayout.tsx # Main shell (nav, footer, player)
│
├── lib/
│   ├── managers/               # ALL business logic lives here
│   │   ├── audioManager.ts
│   │   ├── queueManager.ts
│   │   ├── playlistManager.ts
│   │   ├── mediaManager.ts
│   │   ├── userManager.ts
│   │   ├── searchManager.ts
│   │   ├── downloaderManager.ts
│   │   ├── vocabularyManager.ts
│   │   ├── playerUIManager.ts
│   │   ├── notificationManager.ts
│   │   ├── webSocketManger.ts
│   │   └── ...
│   ├── rockit/rockIt.ts        # Singleton with all managers
│   ├── store.ts                # createAtom / createArrayAtom
│   ├── utils/
│   │   └── apiFetch.ts         # Zod-validated fetch
│   └── errors/AppError.ts
│
├── hooks/                      # Global hooks
│   ├── useFetch.ts             # Fetch + Zod
│   ├── useSession.ts
│   └── useWindowSize.ts
│
├── dto/                        # AUTO-GENERATED — never edit
│   └── index.ts                # Barrel export
│
├── types/                      # TypeScript interfaces
├── models/enums/               # Shared enums
├── styles/
│   ├── globals.css             # Tailwind @import
│   ├── base.css                # Reset, CSS vars, @custom-variant md
│   ├── animations.css          # @keyframes
│   └── components.css          # Scrollbars, slider, skeleton
└── public/lang/                # Vocabulary JSON files (en, es, eu…)
```

### 5.2 Server vs Client Components

**The most important rule.**

| Rule | Detail |
|------|--------|
| `page.tsx` NEVER has `"use client"` | Pages are always Server Components |
| `"use client"` only when using hooks or browser APIs | useState, useEffect, useRouter, events |
| Interactive logic goes in `*Client.tsx` | Page just imports and renders it |

```tsx
// ✅ app/(protected)/(app)/somefeature/page.tsx
import SomeFeatureClient from "@/components/SomeFeature/SomeFeatureClient";

export default async function SomeFeaturePage() {
    const data = await fetchServerSide(); // runs on server
    return <SomeFeatureClient initialData={data} />;
}

// ✅ components/SomeFeature/SomeFeatureClient.tsx
"use client";
export default function SomeFeatureClient({ initialData }) {
    const [state, setState] = useState(initialData);
    // hooks, events, etc.
}
```

### 5.3 Data Fetching

**Server-side** (in `page.tsx`):

```tsx
import { BACKEND_URL } from "@/environment";
import { SomeSchema } from "@/dto";

async function getData() {
    const res = await fetch(`${BACKEND_URL}/some/endpoint`, {
        next: { revalidate: 60 },
        credentials: "include",
    });
    if (!res.ok) throw new AppError(res.status);
    return SomeSchema.parse(await res.json());
}
```

**Client-side** (`useFetch` hook):

```tsx
import useFetch from "@/hooks/useFetch";
import { SomeResponseSchema } from "@/dto";

const [data, refresh] = useFetch("/some/endpoint", SomeResponseSchema);
```

**Direct fetch** (in manager methods):

```tsx
import { apiFetch } from "@/lib/utils/apiFetch";

const data = await apiFetch("/some/endpoint", SomeResponseSchema);
```

### 5.4 State Management

```tsx
import { createAtom, createArrayAtom } from "@/lib/store";

// Single value
const playingAtom = createAtom<boolean>(false);
playingAtom.set(true);
playingAtom.get();

// Array (with push, pop, splice, etc.)
const queueAtom = createArrayAtom<Song>([]);
queueAtom.push(song);

// React binding
import { useStore } from "@nanostores/react";
const isPlaying = useStore(rockIt.audioManager.playingAtom);
```

### 5.5 RockIt Singleton

`rockIt` is the global singleton that exposes all managers:

```tsx
import { rockIt } from "@/lib/rockit/rockIt";

rockIt.audioManager.play();
rockIt.audioManager.pause();
rockIt.queueManager.skipForward();
rockIt.queueManager.skipBack();
rockIt.queueManager.addSongNext(song);
rockIt.queueManager.addSongToEnd(song);
rockIt.userManager.toggleRandomQueue();
rockIt.userManager.cyclerepeatSong();
rockIt.userManager.setLangAsync(lang);
rockIt.userManager.setCrossFadeAsync(seconds);
rockIt.userManager.signOut();
rockIt.searchManager.search(query);
rockIt.playlistManager.createPlaylist(name);
rockIt.downloaderManager.startDownloadAsync(url);
rockIt.notificationManager.notifyError(message);
rockIt.playerUIManager.toggle();
rockIt.playerUIManager.hide();
rockIt.mediaManager.fetchLikedMedia();
rockIt.indexedDBManager.saveSongToIndexedDB(song);

// Constants
rockIt.BACKEND_URL
rockIt.SONG_PLACEHOLDER_IMAGE_URL
rockIt.USER_PLACEHOLDER_IMAGE_URL
```

### 5.6 Error Handling

```tsx
// Throw in pages/server code
if (!res.ok) throw new AppError(res.status);

// notFound() for 404 in pages
import { notFound } from "next/navigation";
if (!data) notFound();

// error.tsx catches AppError automatically
```

### 5.7 Hydration Safety

Components that return `null` based on nanostores atoms cause hydration mismatches (server renders nothing, client renders something). Always return the same element structure:

```tsx
// ❌ Causes hydration mismatch
if (!$user) return null;
return <nav>...</nav>;

// ✅ Correct — same element, invisible until data arrives
if (!$user) return <nav className="opacity-0" aria-hidden />;
return <nav>...</nav>;
```

### 5.8 Styling

```css
/* CSS variables (base.css) */
--rockit-pink: #ee1086;
--rockit-pink-mid: #f53a76;
--rockit-pink-light: #fb6467;

/* Gradient */
bg-gradient-to-r from-[#ee1086] to-[#fb6467]

/* Breakpoints — md: requires BOTH width ≥768px AND height ≥500px */
/* (prevents mobile landscape from activating desktop layout) */
@custom-variant md (@media (min-width: 768px) and (min-height: 500px));
```

**Skeleton loader:**

```tsx
<div className="skeleton h-4 w-1/2 rounded" />
```

---

## 6. Frontend ↔ Backend Contract

### DTO Generation

Backend Pydantic response models are compiled to Zod schemas in `frontend/dto/`:

```bash
cd backend
python3 -m backend zod
```

**Never edit files in `frontend/dto/` manually.**

After adding a backend response model, run `zod` and import the generated schema:

```tsx
import { SomeResponseSchema, type SomeResponse } from "@/dto";
```

### API Base URL

```tsx
// frontend/environment.ts
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
```

Managers use `rockIt.BACKEND_URL`. Server-side fetches use `BACKEND_URL` from `environment.ts`.

### Authentication Flow

1. User logs in → `POST /auth/login` → backend sets `session_id` cookie
2. All subsequent requests send the cookie automatically
3. Server-side: `getUserInServer()` reads cookie from `next/headers`
4. Client-side: `credentials: "include"` on all fetches

### WebSocket

The WebSocket manager connects on app load and dispatches events to managers:

```
/ws → webSocketManager.ts → updates nanostores atoms → React re-renders
```

Events from backend:
- `download_progress` → `downloaderManager.downloadInfoAtom`
- `current_queue` → `queueManager.queueAtom`
- `current_media` → `queueManager.currentSongAtom`
- `current_time` → `audioManager.currentTimeAtom`

---

## 7. Implementing New Features — Full Stack

### Step-by-step example: Add user stats endpoint

#### Backend

```python
# 1. backend/core/requests/statsRequest.py
from pydantic import BaseModel

class StatsRequest(BaseModel):
    range: str  # "7d" | "30d" | "1y"
    start: str | None = None
    end: str | None = None
```

```python
# 2. backend/core/responses/statsResponse.py
from pydantic import BaseModel
from typing import List

class StatsTopItem(BaseModel):
    publicId: str
    name: str
    value: int
    imageUrl: str | None

class UserStatsResponse(BaseModel):
    songsListened: int
    minutesListened: float
    avgMinutesPerSong: float
    topSongs: List[StatsTopItem]
    topAlbums: List[StatsTopItem]
    topArtists: List[StatsTopItem]
```

```python
# 3. backend/core/access/statsAccess.py
class StatsAccess:
    @staticmethod
    async def get_user_stats_async(
        session: AsyncSession, user_id: int, range: str
    ) -> AResult[UserStatsResponse]:
        """Get aggregated listening stats for a user."""

        # SQLAlchemy queries here
        ...
        return AResult(code=AResultCode.OK, message="OK", result=stats)
```

```python
# 4. backend/core/framework/stats.py
class Stats:
    @staticmethod
    async def get_user_stats_async(
        session: AsyncSession, user_id: int, range: str
    ) -> AResult[UserStatsResponse]:
        """Get user listening stats."""

        return await StatsAccess.get_user_stats_async(
            session=session, user_id=user_id, range=range
        )
```

```python
# 5. backend/core/controllers/statsController.py
@router.get("/stats/user")
async def get_user_stats(
    request: Request,
    range: str = "7d",
    _=Depends(AuthMiddleware.auth_dependency),
) -> UserStatsResponse:
    """Get user listening statistics."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401)

    a_result = await Stats.get_user_stats_async(
        session=session, user_id=a_result_user.result().id, range=range
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code())

    return a_result.result()
```

#### Generate DTO

```bash
cd backend && python3 -m backend zod
```

#### Frontend

```tsx
// components/Stats/UserStats.tsx — replace MOCK_* with real fetch
import useFetch from "@/hooks/useFetch";
import { UserStatsResponseSchema } from "@/dto";

export default function UserStats({ range, customStart, customEnd }) {
    const query = customStart && customEnd
        ? `range=custom&start=${customStart}&end=${customEnd}`
        : `range=${range}`;

    const [data] = useFetch(`/stats/user?${query}`, UserStatsResponseSchema);

    if (!data) return <StatsSkeleton />;
    // render with real data
}
```

---

## 8. Code Conventions

### Both Layers

- All code, comments, and variable names in **English**
- No `console.log` / `console.warn` in production code
- Use absolute imports (`@/` prefix in frontend, full module paths in backend)
- Always use keyword arguments in Python function calls

### Backend

```python
# Imports order
import os                                       # 1. stdlib (shortest → longest)
from backend.utils.logger import getLogger      # 2. backend.utils
from backend.core.aResult import AResult        # 3. aResult
from backend.core.access.userAccess import ...  # 4. access
from backend.core.framework.user import ...     # 5. framework
from backend.core.middlewares.auth import ...   # 6. middlewares
from backend.core.responses.ok import ...       # 7. responses
from backend.core.requests.login import ...     # 8. requests

# Every method: async, static, docstring, typed
class SomeFramework:
    @staticmethod
    async def do_something_async(session: AsyncSession, user_id: int) -> AResult[str]:
        """Brief description of what this does."""

        a_result: AResult[str] = await SomeAccess.do_something_async(
            session=session, user_id=user_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error. {a_result.info()}", exc_info=True)
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

# Run black after every edit
# venv/bin/python -m black <file>
```

### Frontend

```tsx
// Naming
page.tsx             // Server Component
SomeFeatureClient.tsx // "use client" wrapper
useFeatureName.ts    // hook (no JSX → .ts not .tsx)
someManager.ts       // manager

// label always needs htmlFor
<label htmlFor="my-input">Name</label>
<input id="my-input" />

// Never label without htmlFor — use span/p instead
<p className="text-sm text-neutral-400">Decorative text</p>

// Touch events need passive for iOS
el.addEventListener("touchstart", handler, { passive: true });

// SSR guard for browser APIs
if (typeof window !== "undefined") { ... }

// Hydration: don't return null based on nanostores atoms (see §5.7)
```

---

## 9. Things to Never Do

### Backend

- Never raise exceptions inside framework or access layers
- Never call access layer directly from controller
- Never create database sessions inside access functions
- Never write raw SQL in framework or controller layers
- Never return `dict` or raw types from endpoints — always use a Pydantic `BaseModel`
- Never send the internal `id` to the client — always use `public_id`

### Frontend

- Never add `"use client"` to a `page.tsx`
- Never call `redirect()` from Next.js inside an `onClick` — use `useRouter().push()`
- Never use `React.cloneElement` for prop injection — use Context
- Never put business logic in a component — put it in a manager
- Never use `<label>` without `htmlFor` — use `<span>` or `<p>` for decorative text
- Never fetch without Zod validation
- Never use `console.log` or `console.warn` in production code
- Never use `window` or `document` without an SSR guard
- Never use relative imports — always `@/`
- Never edit files in `frontend/dto/` manually
- Never return `null` based on nanostores atoms (causes hydration mismatch — return empty element instead)

---

## 10. Key Files Reference

### Backend

| File | Purpose |
|------|---------|
| `backend/core/main.py` | FastAPI app entry, router discovery |
| `backend/core/aResult.py` | Result wrapper |
| `backend/core/access/db/rockItDb.py` | DB connection manager |
| `backend/core/access/db/ormModels/user.py` | User ORM model |
| `backend/core/controllers/authController.py` | Auth endpoints |
| `backend/core/controllers/mediaController.py` | Media endpoints |
| `backend/core/controllers/statsController.py` | Stats endpoints |
| `backend/core/framework/auth/session.py` | Session management |
| `backend/core/framework/providers/providers.py` | Provider registry |
| `backend/core/framework/provider/baseProvider.py` | Base provider interface |
| `backend/core/middlewares/dbSessionMiddleware.py` | Session per request |
| `backend/core/middlewares/authMiddleware.py` | Authentication |
| `backend/constants.py` | Environment config |
| `backend/spotify/framework/provider/spotifyProvider.py` | Spotify provider |
| `backend/youtube/framework/provider/youtubeProvider.py` | YouTube provider |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/app/layout.tsx` | Root layout |
| `frontend/app/(protected)/layout.tsx` | Auth check |
| `frontend/components/Layout/AppClientLayout.tsx` | App shell (nav, footer, player) |
| `frontend/lib/store.ts` | createAtom / createArrayAtom |
| `frontend/lib/rockit/rockIt.ts` | Global singleton |
| `frontend/lib/managers/audioManager.ts` | Audio playback |
| `frontend/lib/managers/queueManager.ts` | Queue |
| `frontend/lib/managers/webSocketManger.ts` | WebSocket |
| `frontend/lib/utils/apiFetch.ts` | Zod-validated fetch |
| `frontend/lib/errors/AppError.ts` | Error class |
| `frontend/lib/getUserInServer.ts` | Server-side session check |
| `frontend/hooks/useFetch.ts` | Client-side fetch hook |
| `frontend/dto/index.ts` | DTO barrel (auto-generated) |
| `frontend/styles/base.css` | Reset, CSS vars, md breakpoint override |
| `frontend/styles/components.css` | Scrollbars, slider, skeleton, safe-area |
| `frontend/environment.ts` | BACKEND_URL |