"""Local download metadata and file mapping owned by this provider."""

from backend.core.access.providerStorage import MediaStorage, provider_storage

provider_storage.register(
    MediaStorage("youtube.playlist", external_id="youtube_id"),
    MediaStorage(
        "youtube.video", path="video_path", manageable=True, external_id="youtube_id"
    ),
)
