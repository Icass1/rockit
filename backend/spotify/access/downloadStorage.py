"""Local download metadata and file mapping owned by this provider."""

from backend.core.access.providerStorage import MediaStorage, provider_storage

provider_storage.register(
    MediaStorage("spotify.album", external_id="spotify_id"),
    MediaStorage("spotify.playlist", external_id="spotify_id"),
    MediaStorage(
        "spotify.track",
        image=None,
        path="path",
        album_table="spotify.album",
        manageable=True,
        external_id="spotify_id",
    ),
)
