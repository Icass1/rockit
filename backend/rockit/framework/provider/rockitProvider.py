import re
from logging import Logger


from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.models.urlPattern import UrlPattern
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)


ROCKIT_URL_PATTERNS: list[UrlPattern] = [
    UrlPattern(
        pattern=re.compile(r"https?://rockit\.rockhosting\.org/song/([a-zA-Z0-9]+)"),
        path_template="/spotify/track/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://rockit\.rockhosting\.org/album/([a-zA-Z0-9]+)"),
        path_template="/spotify/album/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://rockit\.rockhosting\.org/artist/([a-zA-Z0-9]+)"),
        path_template="/spotify/artist/{}",
    ),
    UrlPattern(
        pattern=re.compile(
            r"https?://rockit\.rockhosting\.org/playlist/([a-zA-Z0-9]+)"
        ),
        path_template="/spotify/playlist/{}",
    ),
]


class RockItProvider(BaseMediaProvider):
    def __init__(self) -> None:
        super().__init__()
        pass

    def match_url(self, url: str) -> str | None:
        """Check if the URL is a Rockit URL and return the internal path."""
        for up in ROCKIT_URL_PATTERNS:
            match: re.Match[str] | None = up.pattern.match(url)
            if match:
                return up.path_template.format(match.group(1))
        return None


provider = RockItProvider()
name = "RockIt"
