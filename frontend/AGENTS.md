# RockIt Frontend — Agent Rules

> This file is read automatically by OpenCode at session start.
> It defines the conventions, architecture rules, and patterns that must be followed for every change in this codebase.

---

## 🤖 OpenCode — What it is and when to use it

OpenCode is an open-source agentic coding tool (like Claude Code but model-agnostic). It runs in the terminal with a TUI and can read, write, and execute code across the project.

### ✅ Strengths

- **Model-agnostic** — works with any provider: Anthropic, OpenAI, Gemini, Ollama (local)
- **Privacy** — does not store code or context data on external servers (when using local models, 100% private)
- **Multi-agent system** — has specialized agents: `Build` (full access), `Plan` (read-only analysis), `Explore` (codebase navigation)
- **Hooks and custom commands** — you can create `.md` files in `.opencode/commands/` to define reusable prompts
- **Context compaction** — automatically summarizes long sessions to stay within context limits
- **MCP support** — can connect to external tools via Model Context Protocol

### ❌ Weaknesses

- **Local models struggle with long-context agentic tasks** — Ollama defaults to 4096 token context, which breaks tool use. Must manually set `num_ctx` to at least 16k-32k
- **Quality gap with local models** — Qwen3-Coder or similar are good but not on par with Claude Sonnet/Opus for complex refactors
- **Non-deterministic** — results vary between runs, especially with smaller models
- **No built-in skills system** — unlike Claude Code, skills require manual setup via AGENTS.md or hooks

### 🆓 Free / Local model setup (no API cost)

**Option A — Ollama local (full privacy, needs GPU):**

```json
// ~/.config/opencode/opencode.json
{
    "$schema": "https://opencode.ai/config.json",
    "model": "ollama/qwen3-coder:30b-16k",
    "provider": {
        "ollama": {
            "npm": "@ai-sdk/openai-compatible",
            "name": "Ollama (local)",
            "options": { "baseURL": "http://localhost:11434/v1" },
            "models": {
                "qwen3-coder:30b-16k": { "name": "Qwen3 Coder 30B" }
            }
        }
    }
}
```

> ⚠️ Critical: set context window to at least 16k or tools won't work:
> `ollama run qwen3-coder:30b` → `/set parameter num_ctx 32768` → `/save qwen3-coder:30b-16k` → `/bye`

**Option B — Gemini Flash (free tier, API key required but free):**

```bash
export GEMINI_API_KEY=your_key_here
# Then in opencode, /models → select gemini-2.0-flash
```

**Option C — OpenCode Zen (curated free models, no setup):**
Run `/connect` in OpenCode TUI → select OpenCode Zen → sign in at opencode.ai/auth. Includes tested models like `big-pickle` at no cost.

### 🧠 Recommended workflow

- Use **`Plan` agent** (Tab to switch) to analyze before making changes — it's read-only and won't touch files
- Use **`Build` agent** for actual implementation
- Use **`Explore` agent** to navigate the codebase before asking for changes
- Always run the project (`pnpm dev`) to verify changes don't break anything

---

## 🏗️ Architecture — Rules that must always be followed

### Server vs Client Components

**The most important rule in this codebase.**

| Rule                                                             | Detail                                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `page.tsx` files NEVER have `"use client"`                       | Pages are always Server Components                                           |
| `"use client"` only on components that use hooks or browser APIs | useState, useEffect, useRouter, event handlers, etc.                         |
| Data fetching in pages happens on the server                     | Using `getLang`, `getUserInServer`, direct fetch with `next: { revalidate }` |
| Interactive logic is isolated in a `*Client.tsx` component       | The page imports and renders it                                              |

**Pattern to always follow:**

```tsx
// app/(protected)/(app)/somefeature/page.tsx — Server Component
import SomeFeatureClient from "@/components/SomeFeature/SomeFeatureClient";

export default async function SomeFeaturePage() {
    const data = await fetchSomething(); // server-side
    return <SomeFeatureClient initialData={data} />;
}

// components/SomeFeature/SomeFeatureClient.tsx — Client Component
("use client");
export default function SomeFeatureClient({ initialData }) {
    // hooks, state, interactivity here
}
```

### Error handling

All backend errors must be thrown as `AppError` so they are caught by the nearest `error.tsx`:

```ts
// lib/errors/AppError.ts
import { AppError } from "@/lib/errors/AppError";

const res = await fetch("...");
if (!res.ok) throw new AppError(res.status); // 404, 403, 500...
```

`error.tsx` files only render `<ErrorPage code={status} />`. Never put UI logic inside `error.tsx`.

### Data fetching — Zod validation

All API responses MUST be validated with Zod before use. Never trust raw fetch responses.

```ts
// responses/stats/homeStatsResponse.ts
import { z } from "zod";

export const HomeStatsResponse = z.object({
    songsByTimePlayed: z.array(RockItSongWithAlbumResponseSchema),
    randomSongsLastMonth: z.array(RockItSongWithAlbumResponseSchema),
    // ...
});

export type HomeStatsResponse = z.infer<typeof HomeStatsResponse>;
```

The `useFetch` hook receives the Zod schema as second argument and validates automatically:

```ts
const [data] = useFetch("/stats/home", HomeStatsResponse);
// data is typed and validated — if backend sends garbage, it fails fast
```

**Never** do `const data = await res.json()` directly without Zod validation.

### Business logic — Managers

**All logic lives in managers, never in components.**

```
lib/managers/
  audioManager.ts      ← play, pause, seek, volume
  queueManager.ts      ← queue, current song, next/prev
  playlistManager.ts   ← playlist CRUD
  ...
```

Components call managers, they don't implement logic:

```ts
// ✅ Correct
const handlePlay = () => rockIt.audioManager.play(song);

// ❌ Wrong — logic in component
const handlePlay = () => {
    audioRef.current.src = song.url;
    audioRef.current.play();
    setPlaying(true);
};
```

New features that involve state or audio manipulation → add a method to the appropriate manager, then call it from the component.

### Hooks per feature

Hooks that are specific to a component or feature live next to that component:

```
components/
  Home/
    hooks/
      useHomeData.ts      ← data fetching + mapping for Home
      useCarousel.ts      ← carousel logic
  PlayerUI/
    hooks/
      usePlayerControls.ts
      usePlayerKeyboard.ts
```

Global hooks (useFetch, useSession, useWindowSize) stay in `/hooks/`.

### Barrel exports

Every folder in `components/` must have an `index.ts`:

```ts
// components/Home/index.ts
export { default as HomeClient } from "./HomeClient";
export { default as SongsCarousel } from "./SongsCarousel";
export { useHomeData } from "./hooks/useHomeData";
```

This means imports in other files use:

```ts
import { HomeClient } from "@/components/Home";

// not: import HomeClient from "@/components/Home/HomeClient";
```

### Compound components — Context pattern

Components that need to share state between sub-components (like PopupMenu, ContextMenu) use React Context, **never** `React.cloneElement` for prop injection.

```ts
// context.ts
export const PopupMenuContext = createContext<PopupMenuContext | null>(null);
export function usePopupMenu() {
    const ctx = useContext(PopupMenuContext);
    if (!ctx) throw new Error("usePopupMenu must be used inside <PopupMenu>");
    return ctx;
}
```

### Naming conventions

| Type             | Convention       | Example                      |
| ---------------- | ---------------- | ---------------------------- |
| Pages            | `page.tsx`       | `app/(app)/library/page.tsx` |
| Client wrappers  | `*Client.tsx`    | `HomeClient.tsx`             |
| Feature hooks    | `use*` camelCase | `useHomeData.ts`             |
| Managers         | `*Manager.ts`    | `audioManager.ts`            |
| DTOs / Responses | `*Response.ts`   | `homeStatsResponse.ts`       |
| Types            | PascalCase       | `RockItSong`, `Lang`         |

---

## 📁 Project structure

```
frontend/
  app/
    (protected)/
      (app)/
        page.tsx              ← Server Component, renders *Client
        layout.tsx            ← Server Component, renders AppClientLayout
        error.tsx             ← "use client" (required by Next.js), renders <ErrorPage code={500} />
        not-found.tsx         ← Server Component, renders <ErrorPage code={404} />
  components/
    [Feature]/
      [Feature]Client.tsx     ← "use client"
      [SubComponent].tsx
      hooks/
        use[Feature]Data.ts
      sections/
        [Section].tsx
      index.ts                ← barrel export
    Layout/
      AppClientLayout.tsx     ← "use client", wraps the whole app UI
    ErrorPage/
      ErrorPage.tsx           ← shared error UI for all error codes
  lib/
    errors/
      AppError.ts             ← throw new AppError(status)
    managers/                 ← ALL business logic lives here
    utils/
      getLang.ts              ← reads lang JSON from disk (server-only)
  hooks/                      ← global hooks
  contexts/                   ← React contexts (LanguageContext, etc.)
  responses/                  ← Zod schemas for API responses (rename to dto/ when possible)
  types/                      ← TypeScript interfaces
  stores/                     ← nanostores atoms
```

---

## 🚫 Things to never do

- Never add `"use client"` to a `page.tsx`
- Never call `redirect()` from Next.js inside an `onClick` handler (client context) — use `useRouter().push()`
- Never use `React.cloneElement` to pass props to children — use Context
- Never put business logic (audio, queue, playlist manipulation) inside a component — put it in a manager
- Never use `<label>` without a `for`/`htmlFor` attribute — use `<span>` for decorative text
- Never fetch without Zod validation
- Never use `console.log` or `console.warn` in production code — remove before committing
- Never use `innerWidth` or `document` directly without SSR guard (`typeof window !== "undefined"`)

---

## ✅ Before submitting any change

1. Does the modified `page.tsx` still have no `"use client"`?
2. Is new business logic in a manager, not in the component?
3. Is the new API response validated with Zod?
4. Are touch events added with `{ passive: true }` for iOS performance?
5. Does the new component have proper TypeScript types (no `any`)?
6. Is the barrel `index.ts` updated if a new component was added?
