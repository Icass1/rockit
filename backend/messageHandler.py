

import asyncio
from logging import Logger
from typing import Any, List
from logger import getLogger


class MessageHandlderReader:
    def __init__(self, handler: "MessageHandler") -> None:
        self.len_last_get_messages = 0
        self.handler: MessageHandler = handler
        self.logger: Logger = getLogger(
            name=__name__, class_name="MessageHandlderReader")

    async def get(self) -> Any | None:

        while self.len_last_get_messages >= len(self.handler._messages):
            if self.get_finish():
                return
            await asyncio.sleep(0)

        out = self.handler._messages[self.len_last_get_messages]

        self.len_last_get_messages += 1

        # self.logger.info(
        #     f"{self.len_last_get_messages=} {len(self.handler._messages)=}")

        return out

    def get_finish(self) -> bool:

        return self.handler.get_finish() and self.len_last_get_messages >= len(self.handler._messages)


class MessageHandler:
    def __init__(self) -> None:
        self._messages: List[Any] = []
        self.logger: Logger = getLogger(
            name=__name__, class_name="MessageHandler")

        self._end = False

    def get_reader(self) -> MessageHandlderReader:
        return MessageHandlderReader(handler=self)

    def add(self, message: Any) -> None:
        self.logger.debug(message)
        self._messages.append(message)

    def finish(self) -> None:
        self.logger.info("")
        self._end = True

    def get_finish(self) -> bool:
        return self._end
