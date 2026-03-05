import re
from logging import Logger
from typing import List, Pattern, Tuple


from backend.core.framework.provider.baseProvider import BaseProvider
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)


ROCKIT_URL_PATTERNS: List[Tuple[Pattern[str], str]] = [
    (
        re.compile(r"https?://rockit\.rockhosting\.org/song/([a-zA-Z0-9]+)"),
        "/spotify/track/{}",
    ),
    (
        re.compile(r"https?://rockit\.rockhosting\.org/album/([a-zA-Z0-9]+)"),
        "/spotify/album/{}",
    ),
    (
        re.compile(r"https?://rockit\.rockhosting\.org/artist/([a-zA-Z0-9]+)"),
        "/spotify/artist/{}",
    ),
    (
        re.compile(r"https?://rockit\.rockhosting\.org/playlist/([a-zA-Z0-9]+)"),
        "/spotify/playlist/{}",
    ),
]


class RockItProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()
        pass

    def match_url(self, url: str) -> str | None:
        """Check if the URL is a Rockit URL and return the internal path."""
        for pattern, path_template in ROCKIT_URL_PATTERNS:
            match: re.Match[str] | None = pattern.match(url)
            if match:
                return path_template.format(match.group(1))
        return None


provider = RockItProvider()
name = "RockIt"
