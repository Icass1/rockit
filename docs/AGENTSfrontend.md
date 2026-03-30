# Rockit Frontend Documentation

This document provides comprehensive documentation of the Rockit frontend architecture for implementing new features.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Directory Structure](#directory-structure)
3. [Routing](#routing)
4. [Server vs Client Components](#server-vs-client-components)
5. [Data Fetching](#data-fetching)
6. [State Management](#state-management)
7. [Managers Pattern](#managers-pattern)
8. [Error Handling](#error-handling)
9. [Authentication](#authentication)
10. [DTOs and Zod Validation](#dtos-and-zod-validation)
11. [Styling](#styling)
12. [Implementing New Features](#implementing-new-features)
13. [Code Conventions](#code-conventions)
14. [Common Patterns](#common-patterns)

---

## Tech Stack

| Component        | Technology                              |
| ---------------- | --------------------------------------- |
| Framework        | Next.js 16 (App Router)                 |
| Language         | TypeScript                              |
| State Management | Nanostores (custom atom implementation) |
| Data Validation  | Zod                                     |
| Styling          | Tailwind CSS v4                         |
| Icons            | Lucide React                            |
| Charts           | Recharts                                |

---

## Directory Structure

```
frontend/                           # Monorepo (pnpm workspaces)
├── apps/
│   ├── web/                       # Next.js web application
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── (protected)/       # Protected route group
│   │   │   │   ├── (app)/        # Main app pages
│   │   │   │   │   └── page.tsx  # Home (Server Component)
│   │   │   │   └── layout.tsx     # Auth check
│   │   │   ├── login/            # Login page
│   │   │   ├── register/         # Register page
│   │   │   ├── layout.tsx        # Root layout
│   │   │   └── not-found.tsx     # 404 page
│   │   ├── components/            # Feature-based components
│   │   │   ├── Home/
│   │   │   │   └── HomeClient.tsx # Client wrapper
│   │   │   └── ErrorPage/
│   │   ├── styles/               # CSS files
│   │   │   ├── globals.css       # Tailwind imports
│   │   │   ├── base.css          # Reset, CSS vars
│   │   │   ├── animations.css    # @keyframes
│   │   │   └── components.css    # Scrollbars, slider, skeleton
│   │   ├── environment.ts        # BACKEND_URL
│   │   └── package.json
│   │
│   └── mobile/                    # Expo React Native app
│       ├── app/                   # Expo file-based routing
│       │   ├── _layout.tsx       # Root layout
│       │   ├── (tabs)/           # Tab navigation
│       │   └── modal.tsx
│       └── package.json
│
├── packages/                       # Shared packages
│   ├── config/                     # ESLint, TypeScript configs
│   └── shared/                     # Shared code
│       ├── src/
│       │   ├── dto/                # Zod schemas (auto-generated)
│       │   ├── lib/
│       │   │   └── getUserInServer.ts
│       │   └── index.ts           # Barrel export
│       └── package.json
│
├── package.json                    # Workspace root
├── pnpm-workspace.yaml             # pnpm config
└── turbo.json                     # Turborepo config
```

---

## Routing

### Route Groups

| Group         | Purpose                 | Auth Check           |
| ------------- | ----------------------- | -------------------- |
| `(protected)` | Requires authentication | Checked in layout    |
| `(app)`       | Main application pages  | Inherits from parent |

### Key Routes

| Path                   | File                                                 | Description       |
| ---------------------- | ---------------------------------------------------- | ----------------- |
| `/`                    | `app/(protected)/(app)/page.tsx`                     | Home page         |
| `/library`             | `app/(protected)/(app)/library/page.tsx`             | User library      |
| `/search`              | `app/(protected)/(app)/search/page.tsx`              | Search            |
| `/playlist/[publicId]` | `app/(protected)/(app)/playlist/[publicId]/page.tsx` | Playlist          |
| `/album/[publicId]`    | `app/(protected)/(app)/album/[publicId]/page.tsx`    | Album             |
| `/artist/[publicId]`   | `app/(protected)/(app)/artist/[publicId]/page.tsx`   | Artist            |
| `/login`               | `app/login/page.tsx`                                 | Login (public)    |
| `/register`            | `app/register/page.tsx`                              | Register (public) |

---

## Server vs Client Components

**The most important rule in this codebase.**

| Rule                                                          | Detail                                         |
| ------------------------------------------------------------- | ---------------------------------------------- |
| `page.tsx` files NEVER have `"use client"`                    | Pages are always Server Components             |
| `"use client"` only on components using hooks or browser APIs | useState, useEffect, useRouter, event handlers |
| Data fetching in pages happens on the server                  | Using `fetch` with `next: { revalidate }`      |
| Interactive logic is isolated in `*Client.tsx`                | The page imports and renders it                |

### Pattern

```tsx
// apps/web/app/(protected)/(app)/somefeature/page.tsx — Server Component
import { SomeFeatureResponse, SomeResponseSchema } from "@/dto";
import SomeFeatureClient from "@/components/SomeFeature/SomeFeatureClient";

async function getData() {
    const res = await fetch(`${BACKEND_URL}/api/somefeature`, {
        next: { revalidate: 60 },
    });
    return SomeResponseSchema.parse(await res.json());
}

export default async function SomeFeaturePage() {
    const data = await getData(); // Server-side fetch
    return <SomeFeatureClient initialData={data} />;
}

// components/SomeFeature/SomeFeatureClient.tsx — Client Component
("use client");

interface Props {
    initialData: SomeFeatureResponse;
}

export default function SomeFeatureClient({ initialData }: Props) {
    // useState, useEffect, event handlers here
}
```

---

## Data Fetching

### Server-Side (page.tsx)

```tsx
import { HomeStatsResponseSchema } from "@/dto";
import { BACKEND_URL } from "@/environment";

async function getHomeStats() {
    const res = await fetch(`${BACKEND_URL}/stats/home`, {
        next: { revalidate: 60 }, // Cache for 60 seconds
    });
    if (!res.ok) return null;
    return HomeStatsResponseSchema.parse(await res.json());
}
```

### Client-Side (useFetch hook)

```tsx
// hooks/useFetch.ts
import { useEffect, useState } from "react";
import { z, ZodType } from "zod";
import { apiFetch } from "@/lib/utils/apiFetch";

export default function useFetch<T extends ZodType>(
    path: string,
    schema: T
): [z.infer<T> | undefined, () => void] {
    const [data, setData] = useState<z.infer<T> | undefined>(undefined);

    useEffect(() => {
        apiFetch(path, schema).then(setData);
    }, [path, schema]);

    const refresh = () => apiFetch(path, schema).then(setData);
    return [data, refresh];
}

// Usage in component
const [stats] = useFetch("/stats/home", HomeStatsResponseSchema);
```

### API Fetch Utility

```tsx
// lib/utils/apiFetch.ts
export async function apiFetch<T extends ZodType>(
    path: string,
    schema: T,
    options?
) {
    const res = await baseApiFetch(path, options);
    const json = await res.json();
    return schema.parse(json); // Zod validation
}

export async function baseApiFetch(path: string, options?) {
    // Server-side: uses cookies from next/headers
    // Client-side: uses credentials: "include"
}
```

---

## State Management

### Nanostores (Custom Implementation)

The project uses a custom atom implementation based on nanostores:

```tsx
// lib/store.ts

// React binding
import { useStore } from "@nanostores/react";
import { ArrayAtom, Atom, createArrayAtom, createAtom } from "@/lib/store";

// Single value
const playingAtom = createAtom<boolean>(false);
playingAtom.set(true);
const isPlaying = playingAtom.get();

// Array
const queueAtom = createArrayAtom<Song>([]);
queueAtom.push(newSong);
const queue = queueAtom.get();

const isPlaying = useStore(playingAtom);
```

### React Context

For complex state shared between components:

```tsx
// contexts/SomeContext.ts
import { createContext, useContext } from "react";

interface SomeContextType {
    value: string;
    setValue: (v: string) => void;
}

export const SomeContext = createContext<SomeContextType | null>(null);

export function useSomeContext() {
    const ctx = useContext(SomeContext);
    if (!ctx)
        throw new Error("useSomeContext must be used inside SomeProvider");
    return ctx;
}
```

---

## Managers Pattern

**All business logic lives in managers, never in components.**

### Available Managers

| Manager                  | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `audioManager.ts`        | Audio playback (play, pause, seek, volume) |
| `queueManager.ts`        | Queue management (add, remove, reorder)    |
| `playlistManager.ts`     | Playlist CRUD operations                   |
| `albumManager.ts`        | Album operations                           |
| `mediaManager.ts`        | Media (song) operations                    |
| `userManager.ts`         | User session and preferences               |
| `searchManager.ts`       | Search functionality                       |
| `playerUIManager.ts`     | Player UI state                            |
| `webSocketManager.ts`    | WebSocket communication                    |
| `notificationManager.ts` | User notifications                         |
| `vocabularyManager.ts`   | Internationalization strings               |
| `currentListManager.ts`  | Current list state                         |
| `listManager.ts`         | List operations                            |

### RockIt Singleton

```tsx
// lib/rockit/rockIt.ts
import { AudioManager } from "@/lib/managers/audioManager";
import { QueueManager } from "@/lib/managers/queueManager";

export class RockIt {
    audioManager: AudioManager = new AudioManager();
    queueManager: QueueManager = new QueueManager();
    // ... all managers
}

export const rockIt = new RockIt();
```

### Usage in Components

```tsx
// ✅ CORRECT — Logic in manager
const handlePlay = () => rockIt.audioManager.play(song);

// ❌ WRONG — Logic in component
const handlePlay = () => {
    audioRef.current.src = song.url;
    audioRef.current.play();
};
```

### Adding a New Manager Method

1. Add method to appropriate manager class in `lib/managers/`
2. Use atoms for reactive state
3. Call from components using `rockIt.managerName.methodName()`

---

## Error Handling

### Throwing Errors

All backend errors must be thrown as `AppError`:

```tsx
// lib/errors/AppError.ts
export class AppError extends Error {
    constructor(public readonly status: number) {
        super(`AppError: ${status}`);
        this.name = "AppError";
    }
}

// Usage
const res = await fetch("...");
if (!res.ok) throw new AppError(res.status);
```

### Error Boundary

`error.tsx` catches errors and renders the error page:

```tsx
// apps/web/app/(protected)/(app)/error.tsx
"use client";

import { AppError } from "@/lib/errors/AppError";
import ErrorPage from "@/components/ErrorPage/ErrorPage";

export default function Error({ error }: { error: Error; reset: () => void }) {
    const status = error instanceof AppError ? error.status : 500;
    const validCodes = [401, 403, 404, 500] as const;
    const code = validCodes.includes(status as (typeof validCodes)[number])
        ? (status as (typeof validCodes)[number])
        : 500;

    return <ErrorPage code={code} />;
}
```

### 404 Page

```tsx
// apps/web/app/not-found.tsx
import ErrorPage from "@/components/ErrorPage/ErrorPage";

export default function NotFound() {
    return <ErrorPage code={404} />;
}
```

---

## Authentication

### Server-Side Auth Check

```tsx
// packages/shared/src/lib/getUserInServer.ts
import { cookies } from "next/headers";

export async function getUserInServer() {
    const cookieStore = await cookies();
    const session = cookieStore.get("session_id")?.value;

    if (!session) return null;

    const res = await fetch(`${BACKEND_URL}/session`, {
        headers: { Cookie: `session_id=${session}` },
    });

    if (!res.ok) return null;
    return SessionResponseSchema.parse(await res.json());
}
```

### Protected Layout

```tsx
// apps/web/app/(protected)/layout.tsx
import { redirect } from "next/navigation";
import { getUserInServer } from "@rockit/packages/shared";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getUserInServer();

    if (!user) {
        redirect("/login");
    }

    return <>{children}</>;
}
```

---

## DTOs and Zod Validation

### DTO Generation

DTOs are **auto-generated** from backend responses:

```bash
cd backend
python3 -m backend zod
```

Generated files go to `frontend/packages/shared/src/dto/` — **NEVER edit manually**.

### Using DTOs

```tsx
// Import generated schema
import { HomeStatsResponse, HomeStatsResponseSchema } from "@/dto";

// Use in server-side fetch
const data = HomeStatsResponseSchema.parse(await res.json());

// Use in client-side fetch
const [data] = useFetch("/stats/home", HomeStatsResponseSchema);
```

### Base DTOs

Use existing base DTOs for common types:

| DTO                             | Purpose               |
| ------------------------------- | --------------------- |
| `BaseSongWithAlbumResponse`     | Songs with album info |
| `BaseSongWithoutAlbumResponse`  | Songs without album   |
| `BaseArtistResponse`            | Artists               |
| `BaseAlbumWithSongsResponse`    | Albums with songs     |
| `BaseAlbumWithoutSongsResponse` | Album info only       |
| `BasePlaylistResponse`          | Playlists             |
| `BaseVideoResponse`             | Videos                |

---

## Styling

### Tailwind CSS v4

```css
/* styles/globals.css */
@import "tailwindcss";

@theme {
    --color-bg-primary: #0b0b0b;
    /* custom theme variables */
}
```

### Global CSS Files

| File                             | Purpose                        |
| -------------------------------- | ------------------------------ |
| `apps/web/styles/globals.css`    | Tailwind imports and utilities |
| `apps/web/styles/base.css`       | Reset and base styles          |
| `apps/web/styles/animations.css` | Keyframes and animations       |
| `apps/web/styles/components.css` | Shared component styles        |

### Usage

```tsx
// Tailwind classes
<div className="bg-[#0b0b0b] p-4 text-white">
    <button className="bg-green-500 hover:bg-green-600">Click me</button>
</div>
```

---

## Implementing New Features

### Adding a New Page

1. **Create page.tsx** (Server Component) in `apps/web/app/(protected)/(app)/`
2. **Create \*Client.tsx** (Client Component) in `apps/web/components/`
3. **Add barrel export** in components folder
4. **Add DTO** if needed (via backend)

```tsx
// apps/web/app/(protected)/(app)/newfeature/page.tsx
import NewFeatureClient from "@/components/NewFeature/NewFeatureClient";

async function getData() {
    // Server-side fetch
}

export default async function NewFeaturePage() {
    const data = await getData();
    return <NewFeatureClient initialData={data} />;
}

// apps/web/components/NewFeature/NewFeatureClient.tsx
("use client");

interface Props {
    initialData: SomeDataType;
}

export default function NewFeatureClient({ initialData }: Props) {
    // Client logic here
    return <div>...</div>;
}

// apps/web/components/NewFeature/index.ts (barrel export)
export { default as NewFeatureClient } from "./NewFeatureClient";
```

### Adding a New Manager Method

1. Open appropriate manager in `lib/managers/`
2. Add method with proper typing
3. Use atoms for reactive state if needed

```tsx
// lib/managers/someManager.ts
import { createAtom } from "@/lib/store";

export class SomeManager {
    private _someState = createAtom<string>("default");

    get someState() {
        return this._someState.get();
    }

    async doSomething(param: string) {
        // Business logic
    }
}
```

### Adding a New API Endpoint

1. Add response schema in backend (or use existing)
2. Run `python3 -m backend zod` in backend
3. Import DTO in frontend
4. Use in page or component

### Adding Global Hooks

```tsx
// hooks/useSomeHook.ts
import { useEffect, useState } from "react";

export function useSomeHook() {
    const [state, setState] = useState("");

    useEffect(() => {
        // Effect logic
    }, []);

    return { state, setState };
}
```

---

## Code Conventions

### Imports

**Always use absolute imports with `@/`.**

```tsx
// ✅ Correct
import { useFetch } from "@/hooks/useFetch";
import { HomeClient } from "@/components/Home";
// ❌ Wrong
import { useFetch } from "../../hooks/useFetch";
```

### Naming

| Type             | Convention       | Example                      |
| ---------------- | ---------------- | ---------------------------- |
| Pages            | `page.tsx`       | `app/(app)/library/page.tsx` |
| Client wrappers  | `*Client.tsx`    | `HomeClient.tsx`             |
| Feature hooks    | `use*` camelCase | `useHomeData.ts`             |
| Managers         | `*Manager.ts`    | `audioManager.ts`            |
| DTOs / Responses | `*Response.ts`   | `homeStatsResponse.ts`       |
| Types            | PascalCase       | `RockItSong`, `Lang`         |

### Barrel Exports

Every folder in `components/` must have an `index.ts`:

```tsx
// components/Home/index.ts
export { default as HomeClient } from "./HomeClient";
export { default as SongsCarousel } from "./SongsCarousel";
export { useHomeData } from "./hooks/useHomeData";
```

### SSR Guards

Always guard browser APIs:

```tsx
// ✅ Correct
if (typeof window !== "undefined") {
    // Browser-only code
}

// ❌ Wrong — will crash on server
const width = window.innerWidth;
```

### Event Listeners

Add `{ passive: true }` for iOS performance:

```tsx
element.addEventListener("touchstart", handler, { passive: true });
```

### No Console Logs

Never use `console.log` or `console.warn` in production code:

```tsx
// ❌ Wrong
console.log("debug:", value);

// ✅ Correct — use logger or remove entirely
// (Debug code should be removed before committing)
```

---

## Common Patterns

### Server Component with Client Wrapper

```tsx
// page.tsx (Server)
export default async function Page() {
    const data = await fetchData();
    return <ClientWrapper initialData={data} />;
}

// ClientWrapper.tsx (Client)
("use client");
export default function ClientWrapper({ initialData }) {
    // Interactive logic
}
```

### Protected Route

```tsx
// app/(protected)/layout.tsx
export default async function ProtectedLayout({ children }) {
    const user = await getUserInServer();
    if (!user) redirect("/login");
    return children;
}
```

### Error Boundary

```tsx
// app/error.tsx
"use client";
export default function Error({ error }) {
    if (error instanceof AppError) {
        return <ErrorPage code={error.status} />;
    }
    return <ErrorPage code={500} />;
}
```

### Using Managers

```tsx
// Play a song
rockIt.audioManager.play(song);

// Add to queue
rockIt.queueManager.addToQueue(song);

// Search
const results = await rockIt.searchManager.search(query);
```

### Reactive State with Atoms

```tsx
// In manager
private _playingAtom = createAtom<boolean>(false);

play() {
    this._playingAtom.set(true);
}

// In component (using @nanostores/react)
import { useStore } from "@nanostores/react";

function SomeComponent() {
    const isPlaying = useStore(rockIt.audioManager._playingAtom);
    return <div>{isPlaying ? "Playing" : "Paused"}</div>;
}
```

### Compound Components with Context

```tsx
// MenuContext.ts
export const MenuContext = createContext<MenuContextType | null>(null);

export function useMenuContext() {
    const ctx = useContext(MenuContext);
    if (!ctx)
        throw new Error("useMenuContext must be used inside MenuProvider");
    return ctx;
}
```

---

## Running the Frontend

The frontend uses a pnpm monorepo setup. Commands run from the `frontend/` root.

```bash
cd frontend

# Install dependencies
pnpm install

# Development (all apps)
pnpm dev

# Development (web only)
pnpm --filter frontend dev

# Development (mobile only)
pnpm --filter @rockit/mobile dev

# Build (all apps)
pnpm build

# Lint (web)
pnpm --filter frontend lint

# Type check
pnpm --filter frontend typecheck
pnpm --filter @rockit/shared typecheck
pnpm --filter @rockit/mobile typecheck
```

---

## Key Files Reference

| File                                                   | Purpose                                 |
| ------------------------------------------------------ | --------------------------------------- |
| `frontend/apps/web/app/layout.tsx`                     | Root layout                             |
| `frontend/apps/web/app/(protected)/layout.tsx`         | Auth check layout                       |
| `frontend/apps/web/app/(protected)/(app)/page.tsx`     | Home page (Server)                      |
| `frontend/apps/web/components/Home/HomeClient.tsx`     | Home page (Client)                      |
| `frontend/apps/web/components/ErrorPage/ErrorPage.tsx` | Error page component                    |
| `frontend/apps/web/styles/base.css`                    | Reset, CSS vars, md breakpoint override |
| `frontend/apps/web/styles/components.css`              | Scrollbars, slider, skeleton, safe-area |
| `frontend/apps/web/environment.ts`                     | BACKEND_URL                             |
| `frontend/packages/shared/src/lib/getUserInServer.ts`  | Server-side session check               |
| `frontend/packages/shared/src/dto/index.ts`            | DTO barrel export                       |
| `frontend/packages/shared/src/index.ts`                | Shared package barrel export            |
| `frontend/apps/mobile/app/_layout.tsx`                 | Mobile root layout                      |
| `frontend/apps/mobile/app/(tabs)/index.tsx`            | Mobile home tab                         |
| `frontend/apps/mobile/app/(tabs)/explore.tsx`          | Mobile explore tab                      |

---

This documentation should provide sufficient context to implement any feature in the Rockit frontend. Refer to existing code patterns when implementing new functionality.
