from collections.abc import Sequence
from typing import Any

class CryptContext:
    def __init__(
        self,
        schemes: str | Sequence[str] | None = None,
        default: str | None = None,
        deprecated: str | Sequence[str] | bool | None = None,
        **kwds: Any,
    ) -> None: ...
    def hash(
        self,
        secret: str,
        scheme: str | None = None,
        category: str | None = None,
        **kwds: Any,
    ) -> str: ...
    def verify(
        self,
        secret: str,
        hash: str,
        scheme: str | None = None,
        category: str | None = None,
        **kwds: Any,
    ) -> bool: ...
    def encrypt(
        self,
        secret: str,
        scheme: str | None = None,
        category: str | None = None,
        **kwds: Any,
    ) -> str: ...
    def needs_update(
        self,
        hash: str,
        scheme: str | None = None,
        category: str | None = None,
        **kwds: Any,
    ) -> bool: ...
    def identify(
        self,
        hash: str,
        category: str | None = None,
        resolve: bool = False,
        **kwds: Any,
    ) -> str | None: ...
    def config(
        self,
        scheme: str | None = None,
        **kwds: Any,
    ) -> str: ...
    def using(
        self,
        **kwds: Any,
    ) -> CryptContext: ...
    @property
    def schemes(self) -> list[str]: ...
    @property
    def default_scheme(self) -> str: ...
    @property
    def supported_schemes(self) -> list[str]: ...
