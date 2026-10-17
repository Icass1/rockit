from enum import Enum


class YtdlpFailureEnum(Enum):
    """Why a yt-dlp extraction attempt failed, from the caller's point of view."""

    # YouTube issued an explicit bot challenge or refused the player response.
    BLOCKED = 1

    # The video itself cannot be downloaded by anyone: removed, private,
    # geo-restricted, members-only, age-gated. Trying again is pointless.
    UNAVAILABLE = 2

    # Networking or ffmpeg trouble on our side. Worth retrying as-is.
    TRANSIENT = 3

    # Anything we could not classify.
    UNKNOWN = 4

    # Explicit server throttling, distinct from a refused media URL.
    RATE_LIMITED = 5

    # A media transfer was refused; tokens or client support may be at fault.
    MEDIA_FORBIDDEN = 6

    # Operator action is required; automatic retries cannot repair the setup.
    CONFIGURATION = 7
