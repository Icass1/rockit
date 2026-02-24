

import asyncio
from typing import Any, List
from backend.core.access.downloadAccess import DownloadAccess
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
    def __init__(self, download_id: int, loop: asyncio.AbstractEventLoop) -> None:
        self._messages: List[Any] = []

        self._download_id: int = download_id

        self._end = False
        self._loop = loop

    def get_messages(self):
        return self._messages

    def get_last_messge(self):
        return self._messages[-1]

    def get_reader(self) -> MessageHandlderReader:
        return MessageHandlderReader(handler=self)

    def add(self, message: Any, force: bool = False) -> None:
        completed: float = message['completed']
        status: str = message['message']

        async def _save_status():
            await DownloadAccess.create_download_status(
                download_id=self._download_id,
                completed=completed,
                message=status
            )

        asyncio.run_coroutine_threadsafe(_save_status(), self._loop)

    def finish(self) -> None:
        self._end = True

    def get_finish(self) -> bool:
        return self._end
