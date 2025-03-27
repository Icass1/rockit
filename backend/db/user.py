from typing import TypedDict, List, Optional
import json

class PlaylistDBSong(TypedDict):
    # Assuming the structure of PlaylistDBSong based on previous code
    pass

class UserDBPinnedLists(TypedDict):
    type: str
    createdAt: int
    id: str

class UserDBList(TypedDict):
    type: str
    createdAt: int
    id: str

class RawUserDB(TypedDict):
    id: str
    username: str
    passwordHash: str
    lists: str
    lastPlayedSong: Optional[str]
    currentSong: Optional[str]
    currentStation: Optional[str]
    currentTime: Optional[int]
    queue: str
    queueIndex: Optional[int]
    randomQueue: str
    repeatSong: str
    likedSongs: str
    pinnedLists: str
    volume: int
    crossFade: int
    lang: str
    admin: str
    superAdmin: str
    impersonateId: Optional[str]
    devUser: str
    updatedAt: int
    createdAt: int

class UserDBFull(TypedDict):
    id: str
    username: str
    passwordHash: str
    lists: List[UserDBList]
    lastPlayedSong: Optional[dict]
    currentSong: Optional[str]
    currentStation: Optional[str]
    currentTime: Optional[int]
    queue: List[dict]
    queueIndex: Optional[int]
    randomQueue: str
    repeatSong: str
    likedSongs: List[PlaylistDBSong]
    pinnedLists: List[UserDBPinnedLists]
    volume: int
    crossFade: int
    lang: str
    admin: str
    superAdmin: str
    impersonateId: Optional[str]
    devUser: str
    updatedAt: int
    createdAt: int

def parse_user(raw_user: Optional[RawUserDB]) -> Optional[UserDBFull]:
    if not raw_user:
        return None

    last_played_songs = raw_user.get("lastPlayedSong")

    return UserDBFull(
        id=raw_user.get("id"),
        username=raw_user.get("username"),
        passwordHash=raw_user.get("passwordHash"),
        lists=json.loads(raw_user.get("lists", "[]")),
        lastPlayedSong=json.loads(last_played_songs) if last_played_songs else {},
        currentSong=raw_user.get("currentSong"),
        currentStation=raw_user.get("currentStation"),
        currentTime=raw_user.get("currentTime"),
        queue=json.loads(raw_user.get("queue", "[]")),
        queueIndex=raw_user.get("queueIndex"),
        randomQueue=raw_user.get("randomQueue"),
        repeatSong=raw_user.get("repeatSong"),
        likedSongs=json.loads(raw_user.get("likedSongs", "[]")),
        pinnedLists=json.loads(raw_user.get("pinnedLists", "[]")),
        volume=raw_user.get("volume"),
        crossFade=raw_user.get("crossFade"),
        lang=raw_user.get("lang"),
        admin=raw_user.get("admin"),
        superAdmin=raw_user.get("superAdmin"),
        impersonateId=raw_user.get("impersonateId"),
        devUser=raw_user.get("devUser"),
        updatedAt=raw_user.get("updatedAt"),
        createdAt=raw_user.get("createdAt"),
    )

user_query = """
CREATE TABLE IF NOT EXISTS user (
    id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL UNIQUE,
    lists TEXT DEFAULT "[]" NOT NULL,
    lastPlayedSong TEXT,
    currentSong TEXT,
    currentStation TEXT,
    currentTime INTEGER,
    queue TEXT DEFAULT "[]" NOT NULL,
    queueIndex INTEGER,
    randomQueue BOOLEAN DEFAULT 0 NOT NULL,
    repeatSong BOOLEAN DEFAULT 0 NOT NULL,
    likedSongs TEXT DEFAULT "[]" NOT NULL,
    pinnedLists TEXT DEFAULT "[]" NOT NULL,
    volume INTEGER DEFAULT 1 NOT NULL,
    crossFade INTEGER DEFAULT 0 NOT NULL,
    lang TEXT DEFAULT "en" NOT NULL,
    admin BOOLEAN DEFAULT 0 NOT NULL,
    superAdmin BOOLEAN DEFAULT 0 NOT NULL,
    impersonateId TEXT,
    devUser BOOLEAN DEFAULT 0 NOT NULL,
    updatedAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL
)
"""
