

import asyncio
from typing import Any, List
from backend.utils.logger import getLogger


logger = getLogger(__name__)


class MessageHandlderReader:
    def __init__(self, handler: "MessageHandler") -> None:
        self.len_last_get_messages = 0
        self.handler: MessageHandler = handler

    async def get(self) -> Any | None:

        while self.len_last_get_messages >= len(self.handler.get_messages()):
            if self.get_finish():
                return
            await asyncio.sleep(0)

        out = self.handler.get_messages()[self.len_last_get_messages]

        self.len_last_get_messages += 1

        # self.logger.info(
        #     f"{self.len_last_get_messages=} {len(self.handler._messages)=}")

        return out

    def get_finish(self) -> bool:

        return self.handler.get_finish() and self.len_last_get_messages >= len(self.handler.get_messages())


class MessageHandler:
    def __init__(self) -> None:
        self._messages: List[Any] = []

        self._end = False

    def get_messages(self):
        return self._messages

    def get_last_messge(self):
        return self._messages[-1]

    def get_reader(self) -> MessageHandlderReader:
        return MessageHandlderReader(handler=self)

    def add(self, message: Any, force: bool = False) -> None:
        # if completed is 100, do not add it. after the song has been moeved and updated in database, completed: 100 will be send.

        logger.info(f"add {message} {force}")

    def finish(self) -> None:
        self._end = True

    def get_finish(self) -> bool:
        return self._end
