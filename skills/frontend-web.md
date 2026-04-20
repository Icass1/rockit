# Frontend Web Skill

## Architecture Overview
- Next.js 16 App Router with React 19
- TypeScript with strict mode
- Tailwind CSS v4
- Nanostores for state management
- Zod for runtime validation
- Recharts for data visualization

## Key Conventions

### Server vs Client Components
- `page.tsx` files are ALWAYS Server Components (never use `"use client"`)
- Client logic goes in `*Client.tsx` files with `"use client"` directive
- Use `useState`, `useEffect`, `useRouter`, event handlers only in Client Components

### Data Fetching
- Server-side: Use `apiFetch` from `@/lib/utils/apiFetch` with `next: { revalidate: 60 }` for ISR
- Client-side: Use `useFetch` hook from `@/hooks/useFetch`
- Always validate with Zod schemas from `@/dto` (auto-generated)
- Never fetch without validation

### State Management
- Use nanostores: `createAtom()` for single values, `createArrayAtom()` for arrays
- Access in components with `useStore()` from `@nanostores/react`
- Global singleton: `rockIt` exposes all managers (`rockIt.mediaPlayerManager`, etc.)

### Styling
- Tailwind CSS v4
- CSS variables in `base.css`: `--rockit-pink`, `--rockit-pink-mid`, `--rockit-pink-light`
- Custom breakpoint: `@media (min-width: 768px) and (min-height: 500px)` for `md:` (prevents mobile landscape)
- Skeleton loader: `<div className="skeleton h-4 w-1/2 rounded" />`

### Component Structure
- Feature-based organization in `components/`
- Barrel exports in `index.ts` files
- Client Components suffix: `*Client.tsx`
- Hooks: `use*.ts`
- Utils: `*.ts` in `lib/utils/`
- Managers: `*.ts` in `lib/managers/`
- Models/enums: `frontend/apps/web/models/enums/` (TypeScript enums)
- DTOs: Auto-generated, NEVER edit manually (`packages/shared/src/dto/`)

### Hydration Safety
- Never return `null` based on nanostores atoms (causes hydration mismatch)
- Return same element structure: use `opacity-0` and `aria-hidden` for invisible elements
- Example:
  ```tsx
  // ❌ Wrong
  if (!$user) return null;
  return <nav>...</nav>;
  
  // ✅ Correct
  if (!$user) return <nav className="opacity-0" aria-hidden />;
  return <nav>...</nav>;
  ```

### Error Handling
- Use `notFound()` from `next/navigation` for 404s in pages
- Throw `AppError` for other errors (caught by `error.tsx`)
- Client-side: handle errors from hooks

### Vocabulary / i18n
- Use `rockIt.vocabularyManager.vocabularyAtom` via `useStore` hook
- Access as `$vocabulary.YOUR_KEY`
- Proxy returns key itself if not found (safe fallback)
- Add keys incrementally with feature prefix (e.g., `HOME_`, `SETTINGS_`)

### RockIt Singleton
Access all functionality through:
```tsx
import { rockIt } from "@/lib/rockit/rockIt";

// Playback
rockIt.mediaPlayerManager.play();
rockIt.mediaPlayerManager.pause();
rockIt.mediaPlayerManager.setVolume(0.5);

// Queue
rockIt.queueManager.skipForward();
rockIt.queueManager.skipBack();
rockIt.queueManager.addSongNext(song);
rockIt.queueManager.addSongToEnd(song);

// User
rockIt.userManager.toggleRandomQueue();
rockIt.userManager.setLangAsync(lang);
rockIt.userManager.setCrossFadeAsync(seconds);
rockIt.userManager.signOut();

// Downloads
rockIt.downloaderManager.startDownloadAsync(url);

// Search
rockIt.searchManager.query("search term");

// UI
rockIt.playerUIManager.toggle();
rockIt.playerUIManager.hide();
```

### Managers Reference
All managers are in `@/lib/managers/`:
- `mediaPlayerManager` - audio/video playback
- `queueManager` - playback queue
- `userManager` - profile, settings, language
- `downloaderManager` - downloads
- `searchManager` - search
- `playlistManager` - playlists
- `mediaManager` - liked media
- `notificationManager` - toast notifications
- `webSocketManager` - real-time updates
- `vocabularyManager` - i18n
- `stationManager` - radio
- `indexedDBManager` - local storage
- `serviceWorkerManager` - PWA
- `playerUIManager` - player UI state
- `currentListManager` - current list tracking
- `listManager` - library lists
- `albumManager` - albums
- `authManager` - authentication

### File Structure
```
frontend/
└── apps/
    └── web/                    # Next.js app
        ├── app/                # App Router
        │   ├── (protected)/    # Protected routes
        │   │   ├── (app)/      # Main app
        │   │   │   ├── page.tsx    # Home (Server Component)
        │   │   │   └── layout.tsx  # Auth check
        │   │   ├── login/        # Login page
        │   │   ├── register/     # Register page
        │   │   └── layout.tsx    # Protected layout
        │   └── layout.tsx        # Root layout
        ├── components/         # Feature-based components
        │   ├── Home/
        │   ├── Library/
        │   ├── Player/
        │   └── ...
        ├── lib/                # Libraries and utilities
        │   ├── managers/       # All manager classes
        │   ├── utils/          # apiFetch, getTime, etc.
        │   ├── hooks/          # Custom React hooks
        │   ├── rockit/         # RockIt singleton
        │   └── store.ts        # nanostores helpers
        ├── models/             # TypeScript types and enums
        │   └── enums/          # EContentType, EFilterMode, etc.
        ├── styles/             # CSS files
        │   ├── globals.css     # Tailwind imports
        │   ├── base.css        # Reset, CSS vars
        │   ├── animations.css  # @keyframes
        │   └── components.css  # Scrollbars, slider, skeleton
        └── environment.ts      # BACKEND_URL
```

### Critical Rules
1. **NEVER** add `"use client"` to a `page.tsx`
2. **NEVER** call `redirect()` from Next.js inside an `onClick` - use `useRouter().push()`
3. **NEVER** use `React.cloneElement` for prop injection - use Context
4. **NEVER** put business logic in a component - put it in a manager
5. **NEVER** use `<label>` without `htmlFor` - use `<span>` or `<p>` for decorative text
6. **NEVER** fetch without Zod validation
7. **NEVER** use `console.log` or `console.warn` in production code
8. **NEVER** use `window` or `document` without an SSR guard (`if (typeof window !== "undefined")`)
9. **NEVER** use relative imports - always `@/` prefix
10. **NEVER** edit files in `packages/shared/src/dto/` manually
11. **NEVER** return `null` based on nanostores atoms (causes hydration mismatch)