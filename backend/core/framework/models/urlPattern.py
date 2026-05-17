import re
from dataclasses import dataclass


@dataclass
class UrlPattern:
    """A compiled regex pattern with its path template for URL matching."""

    pattern: re.Pattern[str]
    path_template: str
