# Rockit — Architecture Overview

This is a **music player called Rockit**.

This project uses **Next.js** to serve the frontend **without any computation** in the Next.js server.

The frontend communicates **directly with a FastAPI backend**, and the FastAPI server communicates with a **PostgreSQL database** using **SQLAlchemy ORM (async)**.

---

## Directory Structure

```
frontend/   → all frontend code
backend/    → all backend code
```

Inside the `backend` directory there are **five businesses**:

* **core**
* **default**
* **spotify**
* **youtube**
* **rockit**

### Critical Rule About Core

**There cannot be anything from any other business inside `core`.**
No providers, no references, nothing.

---

## Business Structure

Each business has **3 layers**:

* **controllers** → only interacts with **framework** (directory is named `controllers/`, plural)
* **framework** → only interacts with **access**
* **access** → only interacts with **database**

Rules:

* The **controller never calls access** or database directly.
* The **framework never calls controller**.
* The **access layer never calls framework**.
* All controller files must live in the `controllers/` folder (plural), not `controller/`.

---

## Example Structure (from core)

```
backend
  core
    access
      db
        ormModels
          user.py
          session.py
        ormEnums
        associationTables
        db.py            # imports all tables in ormModels and ormEnums
        base.py          # contains declarative_base

    controllers
      userController.py  # routes for user and session info
      authController.py  # login, register, logout

    enums
      repeatSongEnum.py

    framework
      user/
        user.py
      auth/
        session.py
        register.py
        password.py
        google.py (TODO)

    middlewares
      authMiddleware.py

    requests
      loginRequest.py
      registerRequest.py

    responses
      sessionResponse.py
      okResponse.py

    utils
```

---

## Coding Rules

### Static Classes

All files in **framework** and **access** contain **static classes**.
All methods use `@staticmethod`.

### Everything is async

All functions must be async.

### Strict typing

All variables must include types:

```python
number: int = 3
text: str = "hello"
a_result_text: AResult[str]
```

### Use AResult (never raise exceptions)

All functions must return **AResult**, never raise exceptions internally.
Only **controllers and middleware** may raise `HTTPException`.

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

### Checking AResult

```python
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

logger = getLogger(__name__)

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

If you use the result multiple times:

```python
user: UserRow = a_result_user.result()
```

### Keyword arguments required

Always write:

```python
AResult(code=AResultCode.OK, message="OK", result="text")
```

Not:

```python
AResult(AResultCode.OK, "OK", "text")
```

---

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

---

## Database Rules

### ORM Models and Enums

Table definitions look like:

```python
class ErrorRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    ...
```

### Naming conventions

* Database names → **snake_case**
* Table names → **singular** (`user`, not `users`)

### Association tables

Example: playlists ↔ songs

```
playlist_songs
  playlist_id
  song_id
```

Used for many-to-many relations.

---

## SpotifyApiTypes — Pydantic BaseModel

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

---

## Session Scope Pattern

The framework layer (e.g. `Spotify` class in `spotify.py`) is responsible for opening a single database session and passing it to multiple access functions. Access functions (e.g. `SpotifyAccess.get_or_create_*`) must accept a `session: AsyncSession` parameter instead of opening their own session.

This keeps all related writes in one transaction and avoids opening redundant sessions.

```python
# Framework opens the session scope.
async with rockit_db.session_scope_async() as session:
    artist_map = {}
    for raw_artist in raw_artists:
        a = await SpotifyAccess.get_or_create_artist(raw_artist, session, provider_id)
        if a.is_ok():
            artist_map[raw_artist.id] = a.result()

    await SpotifyAccess.get_or_create_album(raw_album, artist_map, session, provider_id)
```

---

## Development Tools

To get pylance errors, execute:

```bash
venv/bin/python3 -m pyright
```
