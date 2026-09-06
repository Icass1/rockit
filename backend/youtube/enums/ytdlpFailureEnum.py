from enum import Enum


class YtdlpFailureEnum(Enum):
    """Why a yt-dlp extraction attempt failed, from the caller's point of view."""

    # YouTube throttled or challenged us: 429, "sign in to confirm you're not a
    # bot", 403 on the media host, or a client whose formats were all gated
    # behind a PO token. Another strategy or another IP may still work.
    BLOCKED = 1

    # The video itself cannot be downloaded by anyone: removed, private,
    # geo-restricted, members-only, age-gated. Trying again is pointless.
    UNAVAILABLE = 2

    # Networking or ffmpeg trouble on our side. Worth retrying as-is.
    TRANSIENT = 3

    # Anything we could not classify.
    UNKNOWN = 4
