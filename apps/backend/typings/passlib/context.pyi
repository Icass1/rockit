from collections.abc import Sequence

class CryptContext:
    def __init__(
        self,
        schemes: str | Sequence[str] | None = None,
        default: str | None = None,
        deprecated: str | Sequence[str] | bool | None = None,
        **kwds: object,
    ) -> None: ...
    def hash(
        self,
        secret: str,
        scheme: str | None = None,
        category: str | None = None,
        **kwds: object,
    ) -> str: ...
    def verify(
        self,
        secret: str,
        hash: str,
        scheme: str | None = None,
        category: str | None = None,
        **kwds: object,
    ) -> bool: ...
    def encrypt(
        self,
        secret: str,
        scheme: str | None = None,
        category: str | None = None,
        **kwds: object,
    ) -> str: ...
    def needs_update(
        self,
        hash: str,
        scheme: str | None = None,
        category: str | None = None,
        **kwds: object,
    ) -> bool: ...
    def identify(
        self,
        hash: str,
        category: str | None = None,
        resolve: bool = False,
        **kwds: object,
    ) -> str | None: ...
    def config(
        self,
        scheme: str | None = None,
        **kwds: object,
    ) -> str: ...
    def using(
        self,
        **kwds: object,
    ) -> CryptContext: ...
    @property
    def schemes(self) -> list[str]: ...
    @property
    def default_scheme(self) -> str: ...
    @property
    def supported_schemes(self) -> list[str]: ...
