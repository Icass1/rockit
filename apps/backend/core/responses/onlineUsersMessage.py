from typing import Literal

from pydantic import BaseModel


class OnlineUsersMessage(BaseModel):
    type: Literal["online_users"] = "online_users"
    count: int
