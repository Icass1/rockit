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
  default/  → Default provider
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
```

### Backend
```bash
cd backend
.venv/bin/python -m pytest                         # Run all tests
.venv/bin/python -m pytest path/to/test_file.py   # Run specific test file
.venv/bin/python -m pytest -k "test_name"         # Run tests matching pattern
.venv/bin/python -m pytest --tb=short             # Run with shorter traceback

# Type checking
.venv/bin/python -m pyright
```

## Architecture

### Business Structure (5 layers per business)
Each business has exactly 3 layers:
1. **controllers/** (plural) → Only interacts with **framework**
2. **framework/** → Only interacts with **access**
3. **access/** → Only interacts with **database**

### Critical Rule About Core
**There cannot be anything from any other business inside `core`.**
No providers, no references, nothing.

### Layer Rules
- The **controller never calls access** or database directly.
- The **framework never calls controller**.
- The **access layer never calls framework**.
- All controller files must live in `controllers/` folder (plural), not `controller/`.

### Session Scope Pattern
The framework layer opens a single database session and passes it to multiple access functions. Access functions must accept a `session: AsyncSession` parameter instead of opening their own session.

```python
async with rockit_db.session_scope_async() as session:
    artist_map = {}
    for raw_artist in raw_artists:
        a = await SpotifyAccess.get_or_create_artist(raw_artist, session, provider_id)
        if a.is_ok():
            artist_map[raw_artist.id] = a.result()
```

## Code Style

### Static Classes
All files in **framework** and **access** contain **static classes**.
All methods use `@staticmethod`.

### Everything is Async
All functions must be `async`.

### Strict Typing
All variables must include types:
```python
number: int = 3
text: str = "hello"
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

### Docstrings
The first line of every function or method body must be a triple-quoted docstring.
Leave one blank line between the docstring and the first line of actual code.

```python
def some_function():
    """Brief description of what this function does."""

    actual_code_here()
```

### Comments
- All inline comments must start with a capital letter and end with a period.
- Do not use numbered steps in comments (e.g. `# 1. Check DB` → `# Check DB.`).

### Keyword Arguments Required
Always write:
```python
AResult(code=AResultCode.OK, message="OK", result="text")
```
Not:
```python
AResult(AResultCode.OK, "OK", "text")
```

## Import Order

1. External imports (shortest → longest)
2. `backend.utils`
3. `from backend.core.aResult import AResult, AResultCode`
4. `backend.core.access`
5. `backend.core.framework`
6. `backend.core.middleware`
7. `backend.core.responses`
8. `backend.core.requests`

For another business, use the equivalent order under that business.

## Database

### ORM Models and Enums
Table definitions use:
```python
class ErrorRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    ...
```

### Naming Conventions
- Database names → **snake_case**
- Table names → **singular** (`user`, not `users`)

### Association Tables
Example: playlists ↔ songs
```
playlist_songs
  playlist_id
  song_id
```

## SpotifyApiTypes (Pydantic)

All types in `backend/spotify/spotifyApiTypes/` must inherit from pydantic `BaseModel`, not `dataclass`.

Rules:
- No `_json: dict` field.
- No `__getitem__` method.
- All `Optional` fields must have a default of `None` (e.g. `spotify: Optional[str] = None`).
- Provide a `from_dict` classmethod that wraps `model_validate` for backward-compatible call sites.
- Pydantic handles nested model parsing automatically — no manual field extraction needed.

```python
from typing import Any, Optional
from pydantic import BaseModel

class ExampleModel(BaseModel):
    field: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'ExampleModel':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)
```

## Development Tools

To get pylance errors, execute:
```bash
.venv/bin/python3 -m pyright
```

## No Additional Files

Do NOT create documentation files (*.md) or README files unless explicitly requested by the user.
