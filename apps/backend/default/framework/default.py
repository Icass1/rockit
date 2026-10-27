from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from default.framework.provider.defaultProvider import DefaultProvider


class Default:
    provider: "DefaultProvider"
    provider_name: str
