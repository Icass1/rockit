from typing import Generic, TypeVar

T = TypeVar("T")


class AResultCode:
    OK = 0x1
    GENERAL_ERROR = 0x2
    NOT_FOUND = 0x3
    BAD_REQUEST = 0x4

    _code: int
    _message: str

    def __init__(self, code: int, message: str):
        self._code = code
        self._message = message

    def is_ok(self) -> bool:
        return self._code == self.OK

    def is_not_ok(self) -> bool:
        return not self.is_ok()

    def get_http_code(self):
        if self._code == AResultCode.OK:
            return 200
        if self._code == AResultCode.GENERAL_ERROR:
            return 500
        if self._code == AResultCode.NOT_FOUND:
            return 404
        if self._code == AResultCode.BAD_REQUEST:
            return 400

        raise Exception(f"Code {self._code} not implemented")

    def message(self) -> str:
        return self._message

    def code(self) -> int:
        return self._code

    def code_str(self) -> str:
        if self._code == AResultCode.OK:
            return "OK"
        if self._code == AResultCode.GENERAL_ERROR:
            return "GENERAL_ERROR"
        if self._code == AResultCode.NOT_FOUND:
            return "NOT_FOUND"
        if self._code == AResultCode.BAD_REQUEST:
            return "BAD_REQUEST"

        raise Exception(f"Code {self._code} not implemented")

    def info(self) -> str:
        return f"Message: {self.message()}, Code: {self.code_str()}"


class AResult(Generic[T]):
    _code: AResultCode
    _message: str
    _result: T

    def __init__(self, code: int, message: str, result: T | None = None):
        self._code = AResultCode(code=code, message=message)
        self._message = message
        self._result = result  # type: ignore

        if code == AResultCode.OK and result is None:
            raise ValueError("Must provide result when code is OK")

    def is_ok(self) -> bool:
        return self._code.is_ok()

    def is_not_ok(self) -> bool:
        return self._code.is_not_ok()

    def get_http_code(self):
        return self._code.get_http_code()

    def result(self) -> T:
        return self._result

    def message(self) -> str:
        return self._message

    def code(self) -> int:
        return self._code.code()

    def code_str(self) -> str:
        return self._code.code_str()

    def info(self) -> str:
        return f"Message: {self.message()}, Code: {self.code_str()}"
