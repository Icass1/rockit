from pydantic import BaseModel
from typing import Literal


class TestWebSocketMessage(BaseModel):
    type: Literal["test_web_socket_message"]
