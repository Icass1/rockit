# Rockit Backend Documentation

This document provides comprehensive documentation of the Rockit backend architecture for implementing new features.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Directory Structure](#directory-structure)
3. [Layer Architecture](#layer-architecture)
4. [Database](#database)
5. [AResult Pattern](#aresult-pattern)
6. [Providers System](#providers-system)
7. [Authentication & Sessions](#authentication--sessions)
8. [Middleware](#middleware)
9. [Request/Response Patterns](#requestresponse-patterns)
10. [Implementing New Features](#implementing-new-features)
11. [Code Conventions](#code-conventions)
12. [Key Files Reference](#key-files-reference)

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Web Framework | FastAPI (async) |
| ORM | SQLAlchemy (async) |
| Database Driver | asyncpg |
| Database | PostgreSQL |
| Password Hashing | bcrypt (via passlib/argon2) |
| External APIs | Spotipy (Spotify), yt-dlp (YouTube) |

---

## Directory Structure

```
backend/
├── __main__.py                    # CLI entry point (commands: zod, init-db)
├── constants.py                   # Environment variables configuration
├── requirements.txt               # Python dependencies
│
├── core/                          # Core business (shared functionality)
│   ├── controllers/               # HTTP endpoints
│   │   ├── authController.py      # Login, register, logout
│   │   ├── userController.py      # User management
│   │   ├── mediaController.py     # Media operations (search, get song/album/artist)
│   │   ├── downloadController.py  # Download operations
│   │   ├── wsController.py        # WebSocket
│   │   └── ...
│   ├── framework/                 # Business logic
│   │   ├── auth/                  # Authentication logic
│   │   ├── media/                 # Media operations
│   │   ├── downloader/            # Download management
│   │   ├── provider/              # Base provider class
│   │   │   ├── baseProvider.py    # Abstract provider interface
│   │   │   └── providers.py      # Provider discovery & management
│   │   └── websocket/             # WebSocket manager
│   ├── access/                    # Database operations
│   │   ├── db/                    # Database configuration & ORM models
│   │   │   ├── ormModels/         # SQLAlchemy models
│   │   │   ├── ormEnums/         # Enum definitions
│   │   │   ├── rockItDb.py        # Database connection manager
│   │   │   └── base.py            # SQLAlchemy base class
│   │   ├── userAccess.py
│   │   ├── mediaAccess.py
│   │   └── ...
│   ├── middlewares/               # FastAPI middlewares
│   ├── responses/                 # Pydantic response models
│   ├── requests/                  # Pydantic request models
│   └── aResult.py                 # Result wrapper pattern
│
├── default/                       # User playlists business
│   ├── controllers/
│   ├── framework/
│   ├── access/
│   ├── responses/
│   └── requests/
│
├── spotify/                       # Spotify integration
│   ├── controllers/
│   │   └── spotifyController.py
│   ├── framework/
│   │   ├── spotify.py            # Spotify API wrapper
│   │   ├── spotifyApi.py         # Spotify API calls
│   │   ├── provider/
│   │   │   └── spotifyProvider.py # Provider implementation
│   │   └── download/
│   ├── access/
│   │   ├── spotifyAccess.py
│   │   └── db/                    # Spotify-specific ORM models
│   ├── responses/
│   └── requests/
│
├── youtube/                       # YouTube integration
│   ├── controllers/
│   ├── framework/
│   │   ├── youtube.py
│   │   ├── youtubeApi.py
│   │   └── provider/
│   │       └── youtubeProvider.py
│   ├── access/
│   └── responses/
│
└── rockit/                        # User-uploaded music
    ├── framework/
    │   └── provider/
    │       └── rockitProvider.py
    └── access/
```

---

## Layer Architecture

The most important concept in this codebase. Each business module follows a strict 3-layer pattern:

```
controllers/  →  framework/  →  access/
   (HTTP)       (Logic)       (DB)
```

### Rules

| Layer | Responsibility | What it does | What it MUST NOT do |
|-------|---------------|--------------|-------------------|
| **Controllers** | Handle HTTP requests | Parse requests, validate with Pydantic, call framework, return responses, raise HTTPException | Call access layer directly, return raw dicts |
| **Framework** | Business logic | Transform data, orchestrate operations, apply business rules | Call controllers, raise HTTPException, use raw SQL |
| **Access** | Database operations | CRUD with SQLAlchemy ORM, return ORM models | Call framework, contain business logic |

### Example Flow

```
# 1. HTTP Request arrives at controller
POST /auth/login
  ↓
# 2. Controller parses request, calls framework
authController.py: login()
  → Password.login_user_async(session, username, password)
  ↓
# 3. Framework executes business logic, calls access
framework/auth/password.py: login_user_async()
  → UserAccess.get_user_from_username_async(session, username)
  ↓
# 4. Access queries database
access/userAccess.py: get_user_from_username_async()
  → SQLAlchemy SELECT query
  ↓
# 5. Results flow back up
  ← AResult<UserRow>
  ↓
  ← LoginResponse
```

### Folder Naming

- **Controllers**: Always use **plural** (`controllers/`)
- **Framework**: Always use **singular** (`framework/`)
- **Access**: Always use **singular** (`access/`)

---

## Database

### Connection Management

`backend/core/access/db/rockItDb.py` contains the `RockItDB` class:

```python
rockit_db = RockItDB(
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME
)
```

**Key methods:**

```python
# Wait for async initialization
await rockit_db.wait_for_session_local_async()

# Transaction scope (auto commit/rollback)
async with rockit_db.session_scope_async() as session:
    # do work
    pass

# Execute with session
await rockit_db.execute_with_session(async_func)
```

### Session Per Request

The `DBSessionMiddleware` creates a session for each request:

```python
async with rockit_db.session_scope_async() as session:
    request.state.db = session
    response = await call_next(request)
    return response
```

Controllers access the session via:

```python
session: AsyncSession = DBSessionMiddleware.get_session(request=request)
```

### ORM Models

Models use mixins for common functionality:

```python
class UserRow(
    CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded
):
    __tablename__ = "user"
    __table_args__ = ({"schema": "core", "extend_existing": True},)
    
    username: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    # ... more fields
```

**Available Mixins:**

| Mixin | Adds |
|-------|------|
| `TableAutoincrementId` | `id` (auto-increment PK) |
| `TablePublicId` | `public_id` (UUID string for client-facing IDs) |
| `TableDateUpdated` | `date_updated` (auto-updated timestamp) |
| `TableDateAdded` | `date_added` (creation timestamp) |
| `TableAutoincrementKey` | `key` (for enums) |

**Important:** The `public_id` is used for all client communication. The internal `id` should NEVER be sent to the client.

### Schemas

Each business module can have its own database schema:

```python
# backend/spotify/access/db/db.py
schemas = ["spotify"]
base = CoreBase
```

The system discovers schemas by walking `backend/*/db/db.py` files.

### Enums

Enums use a special pattern:

```python
# backend/core/access/db/ormEnums/repeatModeEnum.py
class RepeatModeEnumRow(CoreBase, TableAutoincrementKey):
    __tablename__ = "repeat_mode_enum"
    __table_args__ = ({"schema": "core"},)
    
    name: Mapped[str] = mapped_column(String, nullable=False)
```

---

## AResult Pattern

All functions in framework and access layers must return `AResult`, never raise exceptions.

### Definition

```python
# backend/core/aResult.py

class AResultCode:
    OK = 0x1
    GENERAL_ERROR = 0x2
    NOT_FOUND = 0x3
    BAD_REQUEST = 0x4
    NOT_IMPLEMENTED = 0x5
    ALREADY_EXISTS = 0x6
    VALIDATION_ERROR = 0x7

class AResult(Generic[T]):
    def __init__(self, code: int, message: str, result: T | None = None):
        # OK requires a result
        # ALLOWED to not have result
        pass
    
    def is_ok(self) -> bool
    def is_not_ok(self) -> bool
    def result() -> T           # Get the result (unsafe, check is_ok first)
    def message() -> str        # Error message
    def code() -> int           # Error code
    def get_http_code() -> int  # Convert to HTTP status code
```

### Usage Pattern

```python
async def get_user_async(session: AsyncSession, user_id: int) -> AResult[UserRow]:
    """Get a user by ID."""
    
    # 1. Call lower layer
    a_result: AResult[UserRow] = await UserAccess.get_user_from_id_async(
        session=session, user_id=user_id
    )
    
    # 2. Check for errors
    if a_result.is_not_ok():
        logger.error(f"Error getting user. {a_result.info()}")
        return AResult(
            code=a_result.code(),  # Propagate error code
            message=a_result.message()
        )
    
    # 3. Return success
    return AResult(
        code=AResultCode.OK,
        message="OK",
        result=a_result.result()
    )
```

### HTTP Status Code Mapping

| AResultCode | HTTP Status |
|-------------|-------------|
| OK | 200 |
| ALREADY_EXISTS | 200 |
| GENERAL_ERROR | 500 |
| NOT_FOUND | 404 |
| BAD_REQUEST | 400 |
| NOT_IMPLEMENTED | 501 |

### Only Controllers Raise Exceptions

```python
# CORRECT - Controller handles AResult
@router.get("/user/{user_id}")
async def get_user(request: Request, user_id: int) -> UserResponse:
    session = DBSessionMiddleware.get_session(request)
    a_result = await UserFramework.get_user_async(session, user_id)
    
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message()
        )
    
    return a_result.result()
```

---

## Providers System

The provider system allows multiple music sources (Spotify, YouTube, RockIt) with a unified interface.

### Base Provider

`backend/core/framework/provider/baseProvider.py`:

```python
class BaseProvider:
    async def search_async(self, query: str) -> AResult[List[BaseSearchResultsItem]]
    async def get_song_async(self, session: AsyncSession, public_id: str) -> AResult[BaseSongWithAlbumResponse]
    async def get_album_async(self, session: AsyncSession, public_id: str) -> AResult[BaseAlbumWithSongsResponse]
    async def get_artist_async(self, session: AsyncSession, public_id: str) -> AResult[BaseArtistResponse]
    async def get_playlist_async(self, session: AsyncSession, user_id: int, public_id: str) -> AResult[BasePlaylistResponse]
    async def get_video_async(self, session: AsyncSession, public_id: str) -> AResult[BaseVideoResponse]
    async def start_download_async(self, session: AsyncSession, public_id: str, download_id: int, download_group_id: int, user_id: int) -> AResult[BaseDownload]
    def match_url(self, url: str) -> str | None  # Match external URLs to internal paths
```

### Provider Discovery

`backend/core/framework/providers/providers.py`:

1. Scans all `framework/provider/` directories for `provider.py` files
2. Imports modules and checks for `provider` and `name` attributes
3. Matches against providers stored in database (`provider` table)
4. Creates provider instances with database IDs

### Implementing a Provider

1. Create `backend/{business}/framework/provider/provider.py`:

```python
from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.aResult import AResult, AResultCode

class MyProvider(BaseProvider):
    async def search_async(self, query: str) -> AResult[List[BaseSearchResultsItem]]:
        # Implementation
        pass
    
    def match_url(self, url: str) -> str | None:
        # Match URLs like https://myservice.com/track/abc123
        import re
        match = re.match(r"https?://myservice\.com/track/([a-z0-9]+)", url)
        if match:
            return f"/myservice/track/{match.group(1)}"
        return None

# Required exports
provider = MyProvider()
name = "MyService"
```

### URL Routing

Providers implement `match_url()` to convert external URLs to internal paths:

```python
# Spotify example
SPOTIFY_URL_PATTERNS = [
    (re.compile(r"https?://open\.spotify\.com/track/(\w+)"), "/spotify/track/{}"),
    (re.compile(r"https?://open\.spotify\.com/album/(\w+)"), "/spotify/album/{}"),
]
```

---

## Authentication & Sessions

### Login Flow

```
1. User submits username/password
2. Password.verify_password() checks hash
3. Session.create_session_async() creates session in DB
4. Session cookie set in response
```

### Session Management

```python
# Create session
await Session.create_session_async(session=session, response=response, user_id=user_id)

# End session (logout)
await Session.end_session_async(session=session, session_id=session_id)

# Get current user from request
a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
```

### Protected Endpoints

```python
@router.get("/playlist/{public_id}")
async def get_playlist(
    request: Request,
    public_id: str,
    _=Depends(AuthMiddleware.auth_dependency),  # Requires auth
) -> PlaylistResponse:
    ...
```

---

## Middleware

### DBSessionMiddleware

Creates a database session for each request:

```python
class DBSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        await rockit_db.wait_for_session_local_async()
        
        async with rockit_db.session_scope_async() as session:
            request.state.db = session
            response = await call_next(request)
            return response
    
    @staticmethod
    def get_session(request: Request) -> AsyncSession:
        return request.state.db
```

### AuthMiddleware

Handles session-based authentication:

```python
class AuthMiddleware:
    @staticmethod
    def auth_dependency(request: Request):
        # Validates session cookie
        # Raises 401 if invalid
        pass
    
    @staticmethod
    def get_current_user(request: Request) -> AResult[UserRow]:
        # Returns current user from session
        pass
    
    @staticmethod
    def get_current_session_id(request: Request) -> AResult[str]:
        # Returns current session ID
        pass
```

---

## Request/Response Patterns

### Requests (Pydantic Input)

```python
# backend/core/requests/loginRequest.py
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str
```

### Responses (Pydantic Output)

```python
# backend/core/responses/loginResponse.py
from pydantic import BaseModel

class LoginResponse(BaseModel):
    userId: str  # Use public_id, not internal id
```

**Important:**
- Always use `public_id` for client-facing IDs
- Response models must be Pydantic `BaseModel`, never `dict` or raw types
- Place in `<business>/responses/`

### Zod DTO Generation

Frontend DTOs are auto-generated from backend responses:

```bash
cd backend
python3 -m backend zod
```

Generated files go to `frontend/dto/` - NEVER edit manually.

---

## Implementing New Features

### Adding a New Endpoint

1. **Create request model** in `<business>/requests/`
2. **Create response model** in `<business>/responses/`
3. **Add access method** in `<business>/access/<entity>Access.py`
4. **Add framework method** in `<business>/framework/<entity>.py`
5. **Add controller endpoint** in `<business>/controllers/<entity>Controller.py`

### Example: Adding a User Preference Endpoint

```python
# 1. backend/core/requests/setVolumeRequest.py
from pydantic import BaseModel

class SetVolumeRequest(BaseModel):
    volume: float  # 0.0 to 1.0
```

```python
# 2. backend/core/responses/okResponse.py (reuse existing)
from backend.core.responses.okResponse import OkResponse
```

```python
# 3. backend/core/access/userAccess.py
@staticmethod
async def set_user_volume_async(
    session: AsyncSession, user_id: int, volume: float
) -> AResult[UserRow]:
    try:
        user = await session.get(UserRow, user_id)
        if not user:
            return AResult(code=AResultCode.NOT_FOUND, message="User not found")
        
        user.volume = volume
        await session.commit()
        await session.refresh(user)
        
        return AResult(code=AResultCode.OK, message="OK", result=user)
    except Exception as e:
        logger.error(f"Error setting volume: {e}")
        return AResult(code=AResultCode.GENERAL_ERROR, message=str(e))
```

```python
# 4. backend/core/framework/user/user.py
class User:
    @staticmethod
    async def set_volume_async(
        session: AsyncSession, user_id: int, volume: float
    ) -> AResult[UserRow]:
        if volume < 0 or volume > 1:
            return AResult(code=AResultCode.BAD_REQUEST, message="Volume must be 0.0-1.0")
        
        return await UserAccess.set_user_volume_async(session, user_id, volume)
```

```python
# 5. backend/core/controllers/userController.py
@router.post("/volume")
async def set_volume(
    request: Request,
    payload: SetVolumeRequest,
    _=Depends(AuthMiddleware.auth_dependency),
) -> OkResponse:
    session = DBSessionMiddleware.get_session(request)
    a_result_user = AuthMiddleware.get_current_user(request)
    
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=a_result_user.get_http_code())
    
    a_result = await User.set_volume_async(
        session=session,
        user_id=a_result_user.result().id,
        volume=payload.volume
    )
    
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code())
    
    return OkResponse()
```

### Adding a New Provider

1. Create `backend/{provider}/framework/provider/provider.py`
2. Implement `BaseProvider` methods
3. Implement `match_url()` for URL routing
4. Export `provider` and `name` variables

### Adding a New Database Table

1. Create model in `backend/core/access/db/ormModels/` (or business-specific)
2. Use mixins: `CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded`
3. Add to appropriate schema in `backend/{business}/access/db/db.py`

---

## Code Conventions

### Imports Order

```python
# 1. External (shortest → longest)
import os
import asyncio
from typing import List, Dict

# 2. backend.utils
from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id

# 3. backend.core.aResult
from backend.core.aResult import AResult, AResultCode

# 4. backend.core.access
from backend.core.access.userAccess import UserAccess

# 5. backend.core.framework
from backend.core.framework.auth.password import Password

# 6. backend.core.middlewares
from backend.core.middlewares.authMiddleware import AuthMiddleware

# 7. backend.core.responses
from backend.core.responses.okResponse import OkResponse

# 8. backend.core.requests
from backend.core.requests.loginRequest import LoginRequest
```

### Type Hints

Always use strict typing:

```python
# ✅ Good
user_id: int
results: List[str]
a_result: AResult[UserRow]
session: AsyncSession

# ❌ Bad
user_id  # no type
results  # no type
```

### Naming

| Type | Convention | Example |
|------|------------|---------|
| Controller files | Plural | `playlistController.py` |
| Framework files | Singular | `playlist.py` |
| Access files | Singular | `playlistAccess.py` |
| Response files | `*Response.py` | `LoginResponse.py` |
| Request files | `*Request.py` | `LoginRequest.py` |

### Keyword Arguments

Always use keyword arguments in function calls:

```python
# ✅ Good
await UserAccess.get_user_async(
    session=session,
    user_id=user_id
)

# ❌ Bad
await UserAccess.get_user_async(session, user_id)
```

### Static Classes

Framework and access classes should be static:

```python
class Password:
    @staticmethod
    async def verify_password(plain: str, hashed: str) -> bool:
        ...
```

### Async Only

Everything must be async:

```python
# ✅ Good
async def get_user_async(...)

# ❌ Bad
def get_user(...)
```

### Logging

```python
from backend.utils.logger import getLogger

logger = getLogger(__name__)

# Always log errors with context
if a_result.is_not_ok():
    logger.error(f"Error getting user. {a_result.info()}", exc_info=True)
    return AResult(code=AResultCode.GENERAL_ERROR, message=a_result.message())
```

### Docstrings

First line is brief description:

```python
async def get_user_async(session: AsyncSession, user_id: int) -> AResult[UserRow]:
    """Get a user by their internal ID."""
    
    # Code here
```

### Formatting

Run black after editing:

```bash
cd backend
venv/bin/python -m black <file>
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/core/main.py` | FastAPI app entry, router discovery |
| `backend/core/aResult.py` | Result wrapper pattern |
| `backend/core/access/db/rockItDb.py` | Database connection manager |
| `backend/core/access/db/ormModels/user.py` | User ORM model |
| `backend/core/controllers/authController.py` | Auth endpoints |
| `backend/core/framework/auth/session.py` | Session management |
| `backend/core/framework/providers/providers.py` | Provider discovery |
| `backend/core/framework/provider/baseProvider.py` | Base provider interface |
| `backend/core/middlewares/dbSessionMiddleware.py` | Session per request |
| `backend/core/middlewares/authMiddleware.py` | Authentication |
| `backend/constants.py` | Environment configuration |
| `backend/spotify/framework/provider/spotifyProvider.py` | Spotify implementation |
| `backend/youtube/framework/provider/youtubeProvider.py` | YouTube implementation |

---

## Running the Backend

```bash
cd backend

# Development
uvicorn backend.core.main:app --reload

# Type checking
venv/bin/python -m pyright

# Initialize database
python3 -m backend init-db

# Generate frontend DTOs
python3 -m backend zod
```

---

## Common Patterns

### Session Scope (with multiple accesses)

```python
async with rockit_db.session_scope_async() as session:
    artist_map = {}
    for raw_artist in raw_artists:
        a = await SpotifyAccess.get_or_create_artist(raw_artist, session, provider_id)
        if a.is_ok():
            artist_map[raw_artist.id] = a.result()
```

### Converting Enum

Always convert enum columns to enum instances immediately after retrieval:

```python
# In access layer
repeat_mode: RepeatModeEnumRow = user.repeat_mode_enum

# Convert to Python enum
user_repeat_mode = RepeatModeEnum(repeat_mode.key)
```

### Public ID vs Internal ID

- **`id`**: Numeric, auto-increment, internal only (foreign keys)
- **`public_id`**: UUID string, for client communication (API, URLs)

NEVER send `id` to the client.

---

This documentation should provide sufficient context to implement any feature in the Rockit backend. Refer to existing code patterns when implementing new functionality.
