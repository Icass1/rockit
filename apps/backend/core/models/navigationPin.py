from dataclasses import dataclass


@dataclass
class NavigationPinRecord:
    public_id: str
    media_type_key: int
    name: str
    image_id: int | None
