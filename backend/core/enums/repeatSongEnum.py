from enum import Enum


class RepeatSongEnum(Enum):
    OFF = 1
    ONE = 2
    ALL = 3
    def __init__(self):
        kwargs: Dict[str, ] = {}
        for k, v in kwargs.items():
            setattr(self, k, v)
