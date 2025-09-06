from logging import Logger
from typing import Any, Dict, Optional

from backend.logger import getLogger
from backend.messageHandler import MessageHandler


class ProgressHandler:
    def __init__(self) -> None:
        self.downloads_ids_dict: Dict[str, str] = {}
        self.downloads_dict: Dict[str, MessageHandler] = {}
        self.logger: Logger = getLogger(
            name=__name__, class_name="ProgressHandler")

    def add_task(
        self,
        description: str,
        start: bool = True,
        total: Optional[float] = 100.0,
        completed: int = 0,
        visible: bool = True,
        **fields: Any,
    ):

        self.downloads_dict[self.downloads_ids_dict[description]].add(
            message={'id': self.downloads_ids_dict[description], 'completed': completed, 'total': total, 'message': fields['message']})

        return self.downloads_ids_dict[description]

    def update(
        self,
        task_id,
        *,
        total: Optional[float] = None,
        completed: Optional[float] = None,
        advance: Optional[float] = None,
        description: Optional[str] = None,
        visible: Optional[bool] = None,
        refresh: bool = False,
        **fields: Any,
    ):
        self.downloads_dict[task_id].add(
            message={'id': task_id, 'completed': completed, 'message': fields['message']})

    def start_task(self, task_id):
        # self.logger.info(task_id)
        pass

    def remove_task(self, task_id):
        # self.logger.info(task_id)
        pass
