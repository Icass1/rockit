from typing import TypedDict, List, Optional
import json
from dataclasses import dataclass


@dataclass
class PlaylistDBSong:
    # Assuming the structure of PlaylistDBSong based on previous code
    pass


@dataclass
class UserDBPinnedLists:
    type: str
    createdAt: int
    id: str


@dataclass
class UserDBList:
    type: str
    createdAt: int
    id: str


@dataclass
class RawUserDB:
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


@dataclass
class UserDBFull:
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

    return UserDBFull(
        id=raw_user.id,
        username=raw_user.username,
        passwordHash=raw_user.passwordHash,
        lists=json.loads(raw_user.lists),
        lastPlayedSong=json.loads(
            raw_user.lastPlayedSong) if raw_user.lastPlayedSong else {},
        currentSong=raw_user.currentSong,
        currentStation=raw_user.currentStation,
        currentTime=raw_user.currentTime,
        queue=json.loads(raw_user.queue),
        queueIndex=raw_user.queueIndex,
        randomQueue=raw_user.randomQueue,
        repeatSong=raw_user.repeatSong,
        likedSongs=json.loads(raw_user.likedSongs),
        pinnedLists=json.loads(raw_user.pinnedLists),
        volume=raw_user.volume,
        crossFade=raw_user.crossFade,
        lang=raw_user.lang,
        admin=raw_user.admin,
        superAdmin=raw_user.superAdmin,
        impersonateId=raw_user.impersonateId,
        devUser=raw_user.devUser,
        updatedAt=raw_user.updatedAt,
        createdAt=raw_user.createdAt,
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
