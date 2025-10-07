
DROP TABLE IF EXISTS main.albums CASCADE;
DROP TABLE IF EXISTS main.album_external_images CASCADE;
DROP TABLE IF EXISTS main.album_artists CASCADE;

DROP TABLE IF EXISTS main.artists CASCADE;
DROP TABLE IF EXISTS main.artist_external_images CASCADE;
DROP TABLE IF EXISTS main.artist_genres CASCADE;

DROP TABLE IF EXISTS main.songs CASCADE;
DROP TABLE IF EXISTS main.song_artists CASCADE;
DROP TABLE IF EXISTS main.song_external_images CASCADE;

DROP TABLE IF EXISTS main.users CASCADE;
DROP TABLE IF EXISTS main.user_library_lists CASCADE;
DROP TABLE IF EXISTS main.user_queue_songs CASCADE;
DROP TABLE IF EXISTS main.user_pinned_lists CASCADE;
DROP TABLE IF EXISTS main.user_liked_songs CASCADE;
DROP TABLE IF EXISTS main.user_history_songs CASCADE;
DROP TABLE IF EXISTS main.user_lists CASCADE;

DROP TABLE IF EXISTS main.playlists CASCADE;
DROP TABLE IF EXISTS main.playlist_songs CASCADE;
DROP TABLE IF EXISTS main.playlist_external_images CASCADE;

DROP TABLE IF EXISTS main.lists CASCADE;
DROP TABLE IF EXISTS main.genres CASCADE;
DROP TABLE IF EXISTS main.errors CASCADE;
DROP TABLE IF EXISTS main.downloads CASCADE;
DROP TABLE IF EXISTS main.internal_images CASCADE;
DROP TABLE IF EXISTS main.external_images CASCADE;
DROP TABLE IF EXISTS main.copyrights CASCADE;
DROP TABLE IF EXISTS main.downloads_status CASCADE;