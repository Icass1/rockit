# Rockit Backend — Agent Documentation

## Tech Stack

| Component | Tech                                |
| --------- | ----------------------------------- |
| Web       | FastAPI (async)                     |
| ORM       | SQLAlchemy (async)                  |
| Driver    | asyncpg                             |
| DB        | PostgreSQL                          |
| Hashing   | bcrypt (via passlib)                |
| APIs      | Spotipy (Spotify), yt-dlp (YouTube) |

## Directory

```
backend/
__main__.py (CLI: zod, init-db)
constants.py
core/
controllers/
authController.py, userController.py, mediaController.py, downloadController.py, wsController.py
framework/
auth/, media/, downloader/, provider/ (baseProvider.py, providers.py), websocket/
access/
db/ (ormModels/, ormEnums/, rockItDb.py, base.py)
middlewares/
responses/, requests/
aResult.py
default/ (user playlists)
spotify/
youtube/
rockit/ (user-uploaded music)
```

## Layer Architecture

```
controllers → framework → access
   (HTTP)    (Logic)     (DB)
```

| Layer       | Does                                                       | Must NOT                                       |
| ----------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Controllers | HTTP, parse, validate, call framework, raise HTTPException | call access, return raw dict                   |
| Framework   | business logic, orchestrate                                | call controllers, raise HTTPException, raw SQL |
| Access      | CRUD, return ORM                                           | call framework, business logic                 |

Folder naming: controllers/ (plural), framework/ (singular), access/ (singular)

## Database

### Connection

```python
rockit_db = RockItDB(username, password, host, port, database)

await rockit_db.wait_for_session_local_async()
async with rockit_db.session_scope_async() as session:
    # work
```

### Session Per Request

```python
async with rockit_db.session_scope_async() as session:
    request.state.db = session
```

Controllers get via `DBSessionMiddleware.get_session(request)`

### ORM Models

```python
class UserRow(CoreBase, TableAutoincrementId, TablePublicId, TableDateUpdated, TableDateAdded):
    __tablename__ = "user"
    __table_args__ = ({"schema": "core"},)

    username: Mapped[str] = mapped_column(String, nullable=False, unique=True)
```

Mixins: TableAutoincrementId (id), TablePublicId (public_id for client), TableDateUpdated, TableDateAdded, TableAutoincrementKey (key for enums)

NEVER send internal id to client — use public_id.

### Enums

```python
class RepeatModeEnumRow(CoreBase, TableAutoincrementKey):
    __tablename__ = "repeat_mode_enum"
```

## AResult Pattern

```python
class AResultCode:
    OK = 0x1
    GENERAL_ERROR = 0x2
    NOT_FOUND = 0x3
    BAD_REQUEST = 0x4
    NOT_IMPLEMENTED = 0x5
    ALREADY_EXISTS = 0x6
    VALIDATION_ERROR = 0x7
```

Usage:

```python
async def get_user_async(session, user_id) -> AResult[UserRow]:
    a_result = await UserAccess.get_user(session, user_id)
    if a_result.is_not_ok():
        logger.error(f"Error. {a_result.info()}")
        return AResult(code=a_result.code(), message=a_result.message())

    return AResult(code=AResultCode.OK, message="OK", result=a_result.result())
```

| AResultCode     | HTTP |
| --------------- | ---- |
| OK              | 200  |
| ALREADY_EXISTS  | 200  |
| NOT_FOUND       | 404  |
| BAD_REQUEST     | 400  |
| GENERAL_ERROR   | 500  |
| NOT_IMPLEMENTED | 501  |

Controller only raises exception:

```python
@router.get("/user/{user_id}")
async def get_user(request, user_id):
    session = DBSessionMiddleware.get_session(request)
    a_result = await UserFramework.get_user_async(session, user_id)

    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()
```

## Providers System

Base provider interface:

```python
class BaseProvider:
    async def search_async(self, query) -> AResult[List[BaseSearchResultsItem]]
    async def get_song_async(self, session, public_id) -> AResult[BaseSongWithAlbumResponse]
    async def get_album_async(self, session, public_id) -> AResult[BaseAlbumWithSongsResponse]
    async def get_artist_async(self, session, public_id) -> AResult[BaseArtistResponse]
    async def get_playlist_async(self, session, user_id, public_id) -> AResult[BasePlaylistResponse]
    async def get_video_async(self, session, public_id) -> AResult[BaseVideoResponse]
    async def start_download_async(self, session, public_id, download_id, download_group_id, user_id)
    def match_url(self, url) -> str | None
```

Discovery: scans backend/\*/framework/provider/provider.py, imports provider + name exports.

Implementation:

```python
class MyProvider(BaseProvider):
    async def search_async(self, query):
        pass

provider = MyProvider()
name = "MyService"
```

## Auth & Sessions

```python
# Create
await Session.create_session_async(session, response, user_id)
# End
await Session.end_session_async(session, session_id)
# Get current
a_result_user = AuthMiddleware.get_current_user(request)
# Protect endpoint
_ = Depends(AuthMiddleware.auth_dependency)
```

## Middleware

DBSessionMiddleware: creates session per request, stores in request.state.db

AuthMiddleware: auth_dependency, get_current_user, get_current_session_id

## Request/Response

Requests (input):

```python
class LoginRequest(BaseModel):
    username: str
    password: str
```

Responses (output):

```python
class LoginResponse(BaseModel):
    userId: str  # use public_id
```

ALWAYS use public_id for client-facing IDs. Response must be Pydantic BaseModel, never dict.

## New Feature

1. Create request model in requests/
2. Create response model in responses/
3. Add access method in access/<entity>Access.py
4. Add framework method in framework/<entity>.py
5. Add controller endpoint in controllers/<entity>Controller.py

## Code Conventions

Import order:

1. external (shortest → longest)
2. backend.utils
3. backend.core.aResult
4. backend.core.access
5. backend.core.framework
6. backend.core.middleware
7. backend.core.responses
8. backend.core.requests

Typing: always strict

```python
user_id: int
results: List[str]
a_result: AResult[UserRow]
session: AsyncSession
```

Keyword args: always use them

Static classes:

```python
class Password:
    @staticmethod
    async def verify_password(plain, hashed) -> bool:
        pass
```

Everything async.

Docstring:

```python
async def get_user_async(session, user_id) -> AResult[UserRow]:
    """Get user by ID."""
```

Run black after editing: `venv/bin/python -m black <file>`

## Key Files

| File                                                  | Purpose                         |
| ----------------------------------------------------- | ------------------------------- |
| backend/core/main.py                                  | FastAPI entry, router discovery |
| backend/core/aResult.py                               | Result wrapper                  |
| backend/core/access/db/rockItDb.py                    | DB connection                   |
| backend/core/access/db/ormModels/user.py              | User ORM                        |
| backend/core/controllers/authController.py            | Auth endpoints                  |
| backend/core/framework/auth/session.py                | Session mgmt                    |
| backend/core/framework/providers/providers.py         | Provider discovery              |
| backend/core/framework/provider/baseProvider.py       | Provider interface              |
| backend/core/middlewares/dbSessionMiddleware.py       | Session per request             |
| backend/core/middlewares/authMiddleware.py            | Auth                            |
| backend/spotify/framework/provider/spotifyProvider.py | Spotify impl                    |
| backend/youtube/framework/provider/youtubeProvider.py | YouTube impl                    |

## Running

```bash
cd backend
uvicorn backend.core.main:app --reload
venv/bin/python -m pyright  # typecheck
python3 -m backend init-db
python3 -m backend zod  # generate frontend DTOs
```
