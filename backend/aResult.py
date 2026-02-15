from typing import Generic, TypeVar, Optional

T = TypeVar("T")


class AResult(Generic[T]):
    OK = 0x1
    GENERAL_ERROR = 0x2
    NOT_FOUND = 0x3

    result: T
    code: int
    message: str

    def __init__(self, code: int, message: str, result: Optional[T] = None):
        self.code = code
        self.message = message

        # Only allow result if code is OK
        if code == self.OK and result is None:
            raise ValueError("Must provide result when code is OK")
        self.result = result

    def is_ok(self) -> bool:
        return self.code == self.OK

    def is_not_ok(self) -> bool:
        return not self.is_ok()

    def get_http_code(self):
        if self.code == AResult.OK:
            return 200
        if self.code == AResult.GENERAL_ERROR:
            return 500
        if self.code == AResult.NOT_FOUND:
            return 404

        raise Exception(f"Code {self.code} not implemented")
