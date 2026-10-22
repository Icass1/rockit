"""Local download metadata and file mapping owned by this provider."""

from backend.core.access.providerStorage import MediaStorage, provider_storage

provider_storage.register(
    MediaStorage("youtube_music.album", name="title", external_id="youtube_id"),
    MediaStorage("youtube_music.playlist", external_id="youtube_id"),
    MediaStorage(
        "youtube_music.track",
        name="title",
        path="path",
        manageable=True,
        external_id="youtube_id",
    ),
)
