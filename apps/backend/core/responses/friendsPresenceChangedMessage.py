from typing import Literal

from pydantic import BaseModel


class FriendsPresenceChangedMessage(BaseModel):
    type: Literal["friends_presence_changed"] = "friends_presence_changed"
    userPublicId: str | None = None
    isOnline: bool = False
    nowPlaying: str | None = None
