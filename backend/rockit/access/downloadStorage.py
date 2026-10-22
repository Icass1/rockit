"""Local download metadata and file mapping owned by this provider."""

from backend.core.access.providerStorage import MediaStorage, provider_storage

provider_storage.register(
    MediaStorage("rockit.album"),
    MediaStorage("rockit.song", path="file_path"),
    MediaStorage("rockit.video", path="file_path"),
)
