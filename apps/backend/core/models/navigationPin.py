from dataclasses import dataclass


@dataclass
class NavigationPinRecord:
    public_id: str
    media_type_key: int
    name: str
    image_id: int | None


@dataclass(frozen=True)
class NavigationShortcut:
    """Provider-owned personal route; Core treats its key and URL as opaque."""

    key: str
    name: str
    url: str
    image_url: str | None = None
    default: bool = False
