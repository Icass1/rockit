"""Local download metadata and file mapping owned by this provider."""

from backend.core.access.providerStorage import MediaStorage, provider_storage

provider_storage.register(
    MediaStorage("spotify_scrapper.album", external_id="spotify_id"),
    MediaStorage("spotify_scrapper.playlist", external_id="spotify_id"),
    MediaStorage(
        "spotify_scrapper.track",
        image=None,
        path="path",
        album_table="spotify_scrapper.album",
        manageable=True,
        external_id="spotify_id",
    ),
)
