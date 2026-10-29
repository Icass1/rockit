from dataclasses import dataclass
from typing import Literal


@dataclass
class NavigationPinRecord:
    public_id: str
    media_type_key: int
    name: str
    image_id: int | None


# These personal Rockit routes do not have a core.media row. Keep their keys
# explicit: a URL or arbitrary public ID must never become an automatic pin.
RockitListKey = Literal["liked", "most-listened", "recent-mix", "last-month", "year-recap"]
ROCKIT_NAVIGATION_LISTS: dict[RockitListKey, str] = {
    "liked": "Liked Songs",
    "most-listened": "Most Listened",
    "recent-mix": "Recent Mix",
    "last-month": "Last Month",
    "year-recap": "Year Recap",
}
DEFAULT_NAVIGATION_LISTS: tuple[RockitListKey, ...] = ("liked", "most-listened", "recent-mix")
