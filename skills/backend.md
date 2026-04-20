# Backend Skill

## Architecture Overview
- FastAPI (async) with Python 3.9+
- SQLAlchemy (async) with PostgreSQL
- asyncpg as PostgreSQL driver
- Pydantic for data validation (requests/responses)
- AResult pattern for error handling
- Provider abstraction for multiple music sources (Spotify, YouTube, RockIt)
- Layered architecture: controllers → framework → access

## Key Conventions

### Layer Architecture
```
controllers/  →  framework/  →  access/
   (HTTP)        (Logic)        (DB)
```

| Layer            | Responsibilities                                                                 | Must NOT do                                                                 |
| ---------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **controllers/** | Parse HTTP, validate with Pydantic, call framework, raise HTTPException          | Call access directly, return dicts, use raw SQL                             |
| **framework/**   | Business logic, orchestrate calls, apply rules                                   | Call controllers, raise HTTPException, use raw SQL                          |
| **access/**      | SQLAlchemy CRUD, SQL queries, return ORM models                                  | Call framework, contain business logic                                      |

**Rule:** SQL statements (raw SQL or SQLAlchemy queries) can ONLY live in `access/` files. Framework and controller layers must never contain SQL.

Folder naming: `controllers/` (plural), `framework/` (singular), `access/` (singular).

### AResult Pattern
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

**Usage in framework/access:**
```python
async def get_user_async(session: AsyncSession, user_id: int) -> AResult[UserRow]:
    a_result = await UserAccess.get_user_from_id_async(session=session, user_id=user_id)
    if a_result.is_not_ok():
        logger.error(f"Error getting user. {a_result.info()}", exc_info=True)
        return AResult(code=a_result.code(), message=a_result.message())
    return AResult(code=AResultCode.OK, message="OK", result=a_result.result())
```

**Usage in controller (only place that raises HTTPException):**
```python
@router.get("/user/{user_id}")
async def get_user(request: Request, user_id: int) -> UserResponse:
    session = DBSessionMiddleware.get_session(request=request)
    a_result = await UserFramework.get_user_async(session=session, user_id=user_id)
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message()
        )
    return a_result.result()
```

| AResultCode     | HTTP |
| --------------- | ---- |
| OK              | 200  |
| ALREADY_EXISTS  | 200  |
| NOT_FOUND       | 404  |
| BAD_REQUEST     | 400  |
| GENERAL_ERROR   | 500  |
| NOT_IMPLEMENTED | 501  |

### Database
- Connection manager: `backend/core/access/db/rockItDb.py`
- Transaction scope: `async with rockit_db.session_scope_async() as session:`
- Session per request: `DBSessionMiddleware` injects `request.state.db`
- Controllers retrieve session: `session = DBSessionMiddleware.get_session(request=request)`

**ORM model example:**
```python
class UserRow(CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded):
    __tablename__ = "user"
    __table_args__ = ({"schema": "core", "extend_existing": True},)

    username: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
```

| Mixin                  | Adds                                              |
| ---------------------- | ------------------------------------------------- |
| `TableAutoincrementId` | `id` (PK, internal only, NEVER send to client)    |
| `TablePublicId`        | `public_id` (UUID string, use for all client API) |
| `TableDateUpdated`     | `date_updated`                                    |
| `TableDateAdded`       | `date_added`                                      |

### Authentication
- Session cookie: `session_id` (set on login, destroyed on logout)
- Middleware: `AuthMiddleware.auth_dependency` for protected endpoints
- Current user: `AuthMiddleware.get_current_user(request)`
- Password hashing: `backend/core/framework/auth/password.py`

### Providers System
Providers abstract multiple music sources (Spotify, YouTube, RockIt).

**Base provider** (`backend/core/framework/provider/baseProvider.py`):
```python
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

**To add a provider:**
1. Create `backend/{name}/framework/provider/provider.py` implementing `BaseProvider`
2. Export `provider = MyProvider()` and `name = "ProviderName"`
3. Register in `backend/core/framework/provider/providers.py`

### Code Style

#### Imports Order
1. Standard library (stdlib)
2. Backend utils (`backend.utils.*`)
3. AResult (`backend.core.aResult`)
4. Access layer (`backend.core.access.*`)
5. Framework layer (`backend.core.framework.*`)
6. Middlewares (`backend.core.middlewares.*`)
7. Responses (`backend.core.responses.*`)
8. Requests (`backend.core.requests.*`)

#### Function Definitions
- Every method: `async`, `static`, with docstring and type hints
- Use keyword arguments in function calls
- Run `black` after every edit

#### File Headers
No file headers (copyright, etc.) unless required by law.

### Critical Rules
1. **NEVER** raise exceptions inside framework or access layers
2. **NEVER** call access layer directly from controller
3. **NEVER** create database sessions inside access functions
4. **NEVER** write raw SQL in framework or controller layers — SQL can only live in `access/` files
5. **NEVER** return `dict` or raw types from endpoints — always use a Pydantic `BaseModel`
6. **NEVER** send the internal `id` to the client — always use `public_id`
7. **ALWAYS** use keyword arguments in Python function calls
8. **ALWAYS** run `black` after every edit
9. **NEVER** edit files in `packages/shared/src/dto/` manually — they are auto-generated
10. **ALWAYS** follow the AResult pattern in framework and access layers

### Key Files
| File                                                    | Purpose                             |
| ------------------------------------------------------- | ----------------------------------- |
| `backend/core/main.py`                                  | FastAPI app entry, router discovery |
| `backend/core/aResult.py`                               | Result wrapper                      |
| `backend/core/access/db/rockItDb.py`                    | DB connection manager               |
| `backend/core/access/db/ormModels/user.py`              | User ORM model                      |
| `backend/core/controllers/authController.py`            | Auth endpoints                      |
| `backend/core/controllers/mediaController.py`           | Media endpoints                     |
| `backend/core/controllers/statsController.py`           | Stats endpoints                     |
| `backend/core/framework/auth/session.py`                | Session management                  |
| `backend/core/framework/providers/providers.py`         | Provider registry                   |
| `backend/core/framework/provider/baseProvider.py`       | Base provider interface             |
| `backend/core/middlewares/dbSessionMiddleware.py`       | Session per request                 |
| `backend/core/middlewares/authMiddleware.py`            | Authentication                      |
| `backend/constants.py`                                  | Environment config                  |
| `backend/spotify/framework/provider/spotifyProvider.py` | Spotify provider                    |
| `backend/youtube/framework/provider/youtubeProvider.py` | YouTube provider                    |

### Running the Project
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