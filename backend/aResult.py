from typing import Generic, TypeVar, Literal

T = TypeVar("T")

Code = Literal[0x1, 0x2]

OK = 0x1
GENERAL_ERROR = 0x2


class AResult(Generic[T]):
    result: T
    code: Code
    message: str

    def __init__(self, code: Code, result: T, message: str):
        self.code = code
        self.result = result
        self.message = message
