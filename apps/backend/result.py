import inspect
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, TypeVar, cast

from logger import logger

T = TypeVar("T")
G = TypeVar("G")


@dataclass(frozen=True)
class ResultTraceEntry:
    """A location where a result was created or propagated."""

    class_name: str
    method_name: str
    file_name: str
    line_number: int
    operation: str

    def format(self) -> str:
        """Return a compact, human-readable representation of this entry."""

        return (
            f"{self.operation}: {self.class_name}.{self.method_name} "
            f"({Path(self.file_name).name}:{self.line_number})"
        )


class ResultCode:
    OK = 0x1
    GENERAL_ERROR = 0x2
    NOT_FOUND = 0x3
    BAD_REQUEST = 0x4
    NOT_IMPLEMENTED = 0x5
    ALREADY_EXISTS = 0x6
    VALIDATION_ERROR = 0x7
    RATE_LIMITED = 0x8
    QUOTA_EXHAUSTED = 0x9
    CONFIGURATION_ERROR = 0xA
    SERVICE_UNAVAILABLE = 0xB

    _code: int
    _message: str

    def __init__(self, code: int, message: str) -> None:
        self._code = code
        self._message = message

    def is_ok(self) -> bool:
        return self._code == self.OK

    def is_not_ok(self) -> bool:
        return not self.is_ok()

    def is_retryable(self) -> bool:
        return self._code in (self.GENERAL_ERROR, self.RATE_LIMITED)

    def is_rate_limited(self) -> bool:
        return self._code in (self.RATE_LIMITED, self.QUOTA_EXHAUSTED)

    def get_http_code(
        self,
    ) -> (
        Literal[200]
        | Literal[409]
        | Literal[500]
        | Literal[404]
        | Literal[400]
        | Literal[501]
        | Literal[403]
        | Literal[429]
        | Literal[503]
    ):
        if self._code == ResultCode.OK:
            return 200
        if self._code == ResultCode.ALREADY_EXISTS:
            return 409
        if self._code == ResultCode.GENERAL_ERROR:
            return 500
        if self._code == ResultCode.NOT_FOUND:
            return 404
        if self._code == ResultCode.BAD_REQUEST:
            return 400
        if self._code == ResultCode.NOT_IMPLEMENTED:
            return 501
        if self._code == ResultCode.VALIDATION_ERROR:
            return 403
        if self._code == ResultCode.RATE_LIMITED:
            return 429
        if self._code == ResultCode.QUOTA_EXHAUSTED:
            return 429
        if self._code in (
            ResultCode.CONFIGURATION_ERROR,
            ResultCode.SERVICE_UNAVAILABLE,
        ):
            return 503

        raise Exception(f"Code {self._code} not implemented")

    def message(self) -> str:
        return self._message

    def code(self) -> int:
        return self._code

    def code_str(self) -> str:
        if self._code == ResultCode.OK:
            return "OK"
        if self._code == ResultCode.ALREADY_EXISTS:
            return "ALREADY_EXISTS"
        if self._code == ResultCode.GENERAL_ERROR:
            return "GENERAL_ERROR"
        if self._code == ResultCode.NOT_FOUND:
            return "NOT_FOUND"
        if self._code == ResultCode.BAD_REQUEST:
            return "BAD_REQUEST"
        if self._code == ResultCode.NOT_IMPLEMENTED:
            return "NOT_IMPLEMENTED"
        if self._code == ResultCode.VALIDATION_ERROR:
            return "VALIDATION_ERROR"
        if self._code == ResultCode.RATE_LIMITED:
            return "RATE_LIMITED"
        if self._code == ResultCode.QUOTA_EXHAUSTED:
            return "QUOTA_EXHAUSTED"
        if self._code == ResultCode.SERVICE_UNAVAILABLE:
            return "SERVICE_UNAVAILABLE"
        if self._code == ResultCode.CONFIGURATION_ERROR:
            return "CONFIGURATION_ERROR"

        raise Exception(f"Code {self._code} not implemented")

    def info(self) -> str:
        return f"Message: {self.message()}, Code: {self.code_str()}"


class Result[T]:
    _code: ResultCode
    _message: str
    _result: T | None

    _trace: list[ResultTraceEntry]
    _checked: bool
    _propagated: bool
    _terminal_log_written: bool
    _original_message: str

    def __init__(
        self,
        code: int,
        message: str,
        result: T | None = None,
        *,
        _trace: list[ResultTraceEntry] | None = None,
    ) -> None:
        self._code = ResultCode(code=code, message=message)
        self._message = message
        self._result = result
        self._trace = list(_trace) if _trace is not None else [self._capture_call("created")]
        self._checked = False
        self._propagated = False
        self._terminal_log_written = False
        self._original_message = message

        if code == ResultCode.OK and result is None:
            raise ValueError("Must provide result when code is OK.")
        if code == ResultCode.ALREADY_EXISTS and result is None:
            pass  # ALLOWED

    @staticmethod
    def ok(result: T) -> "Result[T]":
        return Result(code=ResultCode.OK, message="OK", result=result)

    @staticmethod
    def from_result(result: "Result[G]") -> "Result[T]":
        """Propagate a result and append the caller to its trace."""

        if result.code() == ResultCode.OK:
            raise ValueError("from_result shouldn't be called when code is OK.")

        result._propagated = True
        return Result(
            code=result.code(),
            message=result.message(),
            _trace=[*result._trace, result._capture_call("propagated")],
        )

    @staticmethod
    def _capture_call(operation: str) -> ResultTraceEntry:
        """Capture the first caller outside this Result implementation."""

        frame = inspect.currentframe()
        try:
            while frame is not None:
                frame = frame.f_back
                if frame is None:
                    break
                # Parameterized generic construction (``Result[T](...)``)
                # passes through typing._GenericAlias.__call__. That frame is
                # an implementation detail, not the code that created the
                # Result, so continue until the actual application caller.
                if (
                    frame.f_code.co_filename != __file__
                    and frame.f_globals.get("__name__") != "typing"
                ):
                    self_or_cls = frame.f_locals.get("self") or frame.f_locals.get("cls")
                    class_name = (
                        type(self_or_cls).__name__ if self_or_cls is not None else "<module>"
                    )
                    return ResultTraceEntry(
                        class_name=class_name,
                        method_name=frame.f_code.co_name,
                        file_name=frame.f_code.co_filename,
                        line_number=frame.f_lineno,
                        operation=operation,
                    )
        finally:
            del frame

        return ResultTraceEntry(
            class_name="<unknown>",
            method_name="<unknown>",
            file_name=__file__,
            line_number=0,
            operation=operation,
        )

    def is_ok(self) -> bool:
        self._checked = True
        self._trace.append(self._capture_call("checked"))
        return self._code.is_ok()

    def is_not_ok(self) -> bool:
        self._checked = True
        self._trace.append(self._capture_call("checked"))
        return self._code.is_not_ok()

    def is_retryable(self) -> bool:
        return self._code.is_retryable()

    def is_rate_limited(self) -> bool:
        return self._code.is_rate_limited()

    def get_http_code(
        self,
    ) -> (
        Literal[200]
        | Literal[409]
        | Literal[500]
        | Literal[404]
        | Literal[400]
        | Literal[501]
        | Literal[403]
        | Literal[429]
        | Literal[503]
    ):
        return self._code.get_http_code()

    def result(self) -> T:
        return cast(T, self._result)

    def message(self) -> str:
        return self._message

    def code(self) -> int:
        return self._code.code()

    def code_str(self) -> str:
        return self._code.code_str()

    def info(self) -> str:
        return f"Message: '{self.message()}', Code: '{self.code_str()}'"

    def original_message(self) -> str:
        """Return the message from the first Result in this propagation chain."""

        return self._original_message

    def stack_trace(self) -> tuple[ResultTraceEntry, ...]:
        """Return the recorded creation, propagation, check, and finish locations."""

        return tuple(self._trace)

    def stacktrace(self) -> str:
        """Format the Result chain as a readable stack trace."""

        return "\n".join(entry.format() for entry in self._trace)

    def finish(self) -> None:
        """Log an unchecked terminal failure at a controller or task boundary.

        Call this after the final ``is_ok``/``is_not_ok`` check when the current
        method cannot wrap the failure in another ``Result``. A propagated child
        is a new terminal result, so its log contains the complete chain.
        """

        if (
            self._checked
            and self._code.is_not_ok()
            and not self._propagated
            and not self._terminal_log_written
        ):
            self._trace.append(self._capture_call("finished"))
            logger.error(
                "Result failure: %s\nResult stack trace:\n%s",
                self.info(),
                self.stacktrace(),
                stacklevel=2,
            )
            self._terminal_log_written = True

    def log_if_unpropagated(self) -> None:
        """Compatibility alias for ``finish`` at a terminal boundary."""

        self.finish()
