SET session_replication_role = 'replica';

TRUNCATE TABLE
    spotify.album,
    spotify.album_artist,
    spotify.album_copyright,
    spotify.album_external_image,
    spotify.artist,
    spotify.artist_external_image,
    spotify.artist_genre,
    spotify.copyright,
    spotify.copyright_type_enum,
    spotify.download,
    spotify.download_status_enum,
    spotify.download_status,
    spotify.external_image,
    spotify.genre,
    spotify.internal_image,
    spotify.playlist,
    spotify.playlist_external_image,
    spotify.playlist_track,
    spotify.track,
    spotify.track_artist
RESTART IDENTITY CASCADE;

SET session_replication_role = 'origin';