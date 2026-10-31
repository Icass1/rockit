from typing import Literal

from core.baseModel import BaseModel
from core.responses.friend.friendActivityResponse import FriendActivityItem
from core.responses.friend.friendRequestResponse import FriendRequestResponse
from core.responses.friend.friendResponse import FriendResponse


class SocialSnapshotMessage(BaseModel):
    type: Literal["social_changed"] = "social_changed"
    friends: list[FriendResponse]
    incoming: list[FriendRequestResponse]
    sent: list[FriendRequestResponse]
    activities: list[FriendActivityItem]
