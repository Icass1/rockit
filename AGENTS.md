# Agent Guidelines for Rockit

This document provides guidelines for coding agents working on the Rockit project.

## Project Overview

Rockit is a music player with:
- **Frontend**: Next.js (React) served without computation
- **Backend**: FastAPI with SQLAlchemy ORM (async)
- **Database**: PostgreSQL

### Directory Structure
```
frontend/   → Next.js frontend
backend/    → FastAPI backend
  core/     → Core business (auth, users, sessions)
  spotify/  → Spotify integration
  youtube/  → YouTube integration
  rockit/   → Rockit main business
```

## Commands

### Frontend
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npx tsc --noEmit     # TypeScript type checking
```

### Backend
```bash
cd backend
venv/bin/python -m pytest                         # Run all tests
venv/bin/python -m pytest path/to/test_file.py   # Run specific test file
venv/bin/python -m pytest -k "test_name"        # Run tests matching pattern
venv/bin/python -m pyright                       # Type checking
```

## Architecture

### Business Structure
Each business has exactly 3 layers:
1. **controllers/** (plural) → Only interacts with **framework**
2. **framework/** → Only interacts with **access**
3. **access/** → Only interacts with **database**

### Layer Rules
- The **controller never calls access** or database directly.
- The **framework never calls controller**.
- The **access layer never calls framework**.
- All controller files must live in `controllers/` folder (plural).

### Session Scope Pattern
The framework layer opens a single database session and passes it to multiple access functions.

```python
async with rockit_db.session_scope_async() as session:
    artist_map = {}
    for raw_artist in raw_artists:
        a = await SpotifyAccess.get_or_create_artist(raw_artist, session, provider_id)
        if a.is_ok():
            artist_map[raw_artist.id] = a.result()
```

## Backend Code Style

### Static Classes
All files in **framework** and **access** contain **static classes**.
All methods use `@staticmethod`.

### Everything is Async
All functions must be `async`.

### Strict Typing
All variables must include types:
```python
number: int = 3
a_result_text: AResult[str]
```

### Use AResult (Never Raise Exceptions)
All functions must return **AResult**, never raise exceptions internally.
Only **controllers and middleware** may raise `HTTPException`.

```python
from backend.core.aResult import AResult, AResultCode

class Example:
    @staticmethod
    async def function() -> AResult[str]:
        """Brief description."""

        a_result_example: AResult[str] = await method_that_returns_a_string()
        if a_result_example.is_not_ok():
            logger.error(f"Error getting string. {a_result_example.info()}")
            return AResult(code=AResultCode.GENERAL_ERROR, message=a_result_example.message())

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=a_result_example.result()
        )
```

### Logging
```python
from backend.utils.logger import getLogger
logger = getLogger(__name__)
```

Always log errors with stack traces before returning AResult errors:
```python
if a_result_example.is_not_ok():
    logger.error(f"Error getting string. {a_result_example.info()}", exc_info=True)
    return AResult(code=AResultCode.GENERAL_ERROR, message=a_result_example.message())
```

### Docstrings
The first line of every function must be a triple-quoted docstring.
Leave one blank line between the docstring and the first line of actual code.

### Keyword Arguments Required
Always write keyword arguments:
```python
AResult(code=AResultCode.OK, message="OK", result="text")
```

### Import Order
1. External imports (shortest → longest)
2. `backend.utils`
3. `from backend.core.aResult import AResult, AResultCode`
4. `backend.core.access`
5. `backend.core.framework`
6. `backend.core.middleware`
7. `backend.core.responses`
8. `backend.core.requests`

### Response Classes
All endpoints must return a Pydantic `BaseModel` class from the `responses` folder. Never return `dict` or raw types.

When no useful data needs to be returned (e.g., add/remove operations), use `OkResponse` instead of creating a custom response with meaningless data.

### Code Formatting
Every time you edit a file, you must run `venv/bin/python -m black` on that file to ensure consistent formatting.

## Frontend Code Style

### Server vs Client Components
**The most important rule in this codebase.**

| Rule | Detail |
|---|---|
| `page.tsx` files NEVER have `"use client"` | Pages are always Server Components |
| `"use client"` only on components that use hooks or browser APIs | useState, useEffect, useRouter, event handlers |
| Data fetching in pages happens on the server | Using `getLang`, `getUserInServer`, direct fetch |
| Interactive logic is isolated in a `*Client.tsx` component | The page imports and renders it |

### Error Handling
All backend errors must be thrown as `AppError`:
```ts
const res = await fetch("...");
if (!res.ok) throw new AppError(res.status);
```

### Data Fetching — Zod Validation
All API responses MUST be validated with Zod before use:
```ts
export const HomeStatsResponse = z.object({
  songsByTimePlayed: z.array(RockItSongWithAlbumResponseSchema),
});

export type HomeStatsResponse = z.infer<typeof HomeStatsResponse>;
const [data] = useFetch("/stats/home", HomeStatsResponse);
```

### Business Logic — Managers
All logic lives in managers, never in components:
```ts
// ✅ Correct
const handlePlay = () => rockIt.audioManager.play(song);

// ❌ Wrong — logic in component
const handlePlay = () => {
  audioRef.current.src = song.url;
  audioRef.current.play();
};
```

### Naming Conventions
| Type | Convention | Example |
|---|---|---|
| Pages | `page.tsx` | `app/(app)/library/page.tsx` |
| Client wrappers | `*Client.tsx` | `HomeClient.tsx` |
| Feature hooks | `use*` camelCase | `useHomeData.ts` |
| Managers | `*Manager.ts` | `audioManager.ts` |

### Barrel Exports
Every folder in `components/` must have an `index.ts`:
```ts
export { default as HomeClient } from "./HomeClient";
export { default as SongsCarousel } from "./SongsCarousel";
```

## Database

### ORM Models
```python
class ErrorRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    ...
```

### Naming Conventions
- Database names → **snake_case**
- Table names → **singular** (`user`, not `users`)

## Language

All code, comments, documentation, and messages MUST be written in **English only**.
- Even if the user communicates in Spanish, respond and write in English
- If you edit a file containing Spanish comments or strings, translate them to English
- Variable names, function names, and comments must all be in English

## Things to Never Do

### Backend
- Never raise exceptions in framework or access layers
- Never call access directly from controller
- Never create database sessions in access functions

### Frontend
- Never add `"use client"` to a `page.tsx`
- Never call `redirect()` from Next.js inside an `onClick` handler — use `useRouter().push()`
- Never use `React.cloneElement` to pass props to children — use Context
- Never put business logic inside a component — put it in a manager
- Never use `<label>` without a `for`/`htmlFor` attribute — use `<span>`
- Never fetch without Zod validation
- Never use `console.log` or `console.warn` in production code

## Before Submitting Changes

1. **Backend**: Run pyright type checking (`venv/bin/python -m pyright`)
2. **Frontend**: Run `npx tsc --noEmit` for TypeScript errors
3. **Frontend**: Run `npm run lint` for ESLint errors
4. Does the modified `page.tsx` still have no `"use client"`?
5. Is new business logic in a manager, not in the component?
6. Is the new API response validated with Zod?

## No Additional Files

Do NOT create documentation files (*.md) or README files unless explicitly requested by the user.
