from typing import TypedDict, List, Optional
import json


class ImageDB(TypedDict):
    id: str
    url: str
    path: str


def parse_image(raw_image: Optional[dict]) -> Optional[ImageDB]:
    if not raw_image:
        return None

    return ImageDB(
        id=raw_image.get("id", None),
        url=raw_image.get("url", None),
        path=raw_image.get("path", None),
    )


image_query = """
CREATE TABLE IF NOT EXISTS image (
    id TEXT NOT NULL PRIMARY KEY,
    path TEXT NOT NULL,
    url TEXT NOT NULL
)
"""
