# Rockit Frontend — Agent Documentation

## Tech Stack

| Component  | Tech                      |
| ---------- | ------------------------- |
| Framework  | Next.js 16 (App Router)   |
| Language   | TypeScript                |
| State      | Nanostores (custom atoms) |
| Validation | Zod                       |
| Styling    | Tailwind CSS v4           |
| Icons      | Lucide React              |
| Charts     | Recharts                  |

## Directory

```
frontend/
apps/
web/
app/
 (protected)/  (auth check)
 (app)/     (main pages)
 login/
 register/
 components/
 contexts/
 dto/      (Zod schemas)
 hooks/
 lib/managers/ (business logic)
 styles/
mobile/
app/  (Expo file routing)
packages/
shared/  (dto, lib)
```

## Routing

| Group       | Purpose       |
| ----------- | ------------- |
| (protected) | requires auth |
| (app)       | main pages    |

Key routes: /, /library, /search, /playlist/[publicId], /album/[publicId], /artist/[publicId], /login, /register

## Server vs Client Components

Rule: page.tsx NEVER has "use client". Pages always Server Components. "use client" only for hooks/browser APIs. Data fetching in pages (server). Interactive logic in \*Client.tsx.

Pattern:

```tsx
// page.tsx — Server
import SomeFeatureClient from "@/components/SomeFeature/SomeFeatureClient";

async function getData() {
    const res = await fetch(`${BACKEND_URL}/api/somefeature`, {
        next: { revalidate: 60 },
    });
    return SomeResponseSchema.parse(await res.json());
}

export default async function SomeFeaturePage() {
    const data = await getData();
    return <SomeFeatureClient initialData={data} />;
}

// *Client.tsx — Client
("use client");

export default function SomeFeatureClient({ initialData }) {
    // useState, useEffect, events
}
```

## Data Fetching

Server-side in page.tsx:

```tsx
async function getHomeStats() {
    const res = await fetch(`${BACKEND_URL}/stats/home`, {
        next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return HomeStatsResponseSchema.parse(await res.json());
}
```

Client-side (useFetch hook):

```tsx
const [stats] = useFetch("/stats/home", HomeStatsResponseSchema);
```

apiFetch validates with Zod.

## State Management

Nanostores (custom atoms):

```tsx
import { useStore } from "@nanostores/react";
import { createArrayAtom, createAtom } from "@/lib/store";

const playingAtom = createAtom<boolean>(false);
playingAtom.set(true);
const isPlaying = useStore(playingAtom);

const queueAtom = createArrayAtom<Song>([]);
queueAtom.push(newSong);
```

React Context for complex shared state.

## Managers

All business logic in managers, never components.

| Manager                | Purpose        |
| ---------------------- | -------------- |
| mediaPlayerManager.ts  | Audio playback |
| queueManager.ts        | Queue          |
| playlistManager.ts     | Playlist CRUD  |
| albumManager.ts        | Albums         |
| mediaManager.ts        | Songs          |
| userManager.ts         | User session   |
| searchManager.ts       | Search         |
| playerUIManager.ts     | Player UI      |
| webSocketManager.ts    | WebSocket      |
| notificationManager.ts | Notifications  |
| vocabularyManager.ts   | i18n strings   |

RockIt singleton:

```tsx
import { rockIt } from "@/lib/rockit/rockIt";

rockIt.mediaPlayerManager.play(song);
```

## Error Handling

Throw AppError:

```tsx
if (!res.ok) throw new AppError(res.status);
```

error.tsx catches errors, renders ErrorPage.

404: not-found.tsx returns <ErrorPage code={404} />

## Auth

Server-side check:

```tsx
const cookieStore = await cookies();
const session = cookieStore.get("session_id")?.value;
if (!session) return null;
const res = await fetch(`${BACKEND_URL}/session`, {
    headers: { Cookie: session },
});
```

Protected layout: if (!user) redirect("/login")

## DTOs — Zod Validation

Auto-generated from backend: `python3 -m backend zod`

NEVER edit manually.

Import generated schema:

```tsx
import { HomeStatsResponse, HomeStatsResponseSchema } from "@/dto";
```

## Styling

Tailwind CSS v4:

```css
/* globals.css */
@import "tailwindcss";
@theme {
    --color-bg-primary: #0b0b0b;
}
```

Files: base.css (reset, CSS vars), components.css (scrollbars, slider, skeleton)

## New Feature

1. page.tsx (Server Component) in app/(protected)/(app)/
2. \*Client.tsx (Client) in components/
3. barrel export in components folder
4. DTO via backend

Manager: add method to lib/managers/, use atoms for reactive state

## Code Conventions

Imports: ALWAYS @/

Naming:

| Type            | Convention      |
| --------------- | --------------- |
| Pages           | page.tsx        |
| Client wrappers | \*Client.tsx    |
| Hooks           | use\* camelCase |
| Managers        | \*Manager.ts    |
| DTOs            | \*Response.ts   |

Barrel exports: every components/ folder needs index.ts

SSR guards:

```tsx
if (typeof window !== "undefined") { ... }
```

Event listeners: add { passive: true } for iOS

No console.log in production.

## Common Patterns

Server + Client: page.tsx fetches, passes to ClientWrapper.tsx

Protected route: layout checks auth, redirects if needed

Error boundary: error.tsx catches AppError

Using managers: rockIt.manager.method()

Reactive state: atoms in manager, useStore in component

## Running

Frontend (pnpm monorepo):

```bash
cd frontend
pnpm install
pnpm dev          # all apps
pnpm --filter frontend dev        # web only
pnpm --filter @rockit/mobile dev # mobile only
pnpm build      # all
pnpm lint
pnpm typecheck
```

Key files:

| File                                       | Purpose              |
| ------------------------------------------ | -------------------- |
| apps/web/app/layout.tsx                    | Root layout          |
| apps/web/app/(protected)/layout.tsx        | Auth check           |
| apps/web/app/(protected)/(app)/page.tsx    | Home (Server)        |
| apps/web/components/Home/HomeClient.tsx    | Home (Client)        |
| apps/web/styles/base.css                   | Reset, vars          |
| apps/web/styles/components.css             | Scrollbars, skeleton |
| apps/web/environment.ts                    | BACKEND_URL          |
| packages/shared/src/lib/getUserInServer.ts | Server auth check    |
| packages/shared/src/dto/index.ts           | DTO barrel           |
