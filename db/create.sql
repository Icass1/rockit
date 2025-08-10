-- **********************************************
-- **** File managed by sqlWrapper by RockIt ****
-- **********************************************

SET search_path TO main;

CREATE TABLE IF NOT EXISTS main.external_images (
    id TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL UNIQUE,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS main.internal_images (
    id TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL UNIQUE,
    path TEXT NOT NULL UNIQUE,
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS main.albums (
    id TEXT NOT NULL UNIQUE,
    image_id TEXT NOT NULL,
    name TEXT NOT NULL,
    release_date TEXT NOT NULL,
    popularity INTEGER,
    disc_count INTEGER NOT NULL,
    date_added DATE NOT NULL,
    path TEXT NOT NULL,
    FOREIGN KEY (image_id) REFERENCES internal_images(id),
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS main.album_external_images (
    album_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    FOREIGN KEY (album_id) REFERENCES albums(id),
    FOREIGN KEY (image_id) REFERENCES external_images(id),
    PRIMARY KEY (album_id,image_id)
);
CREATE TABLE IF NOT EXISTS main.artists (
    id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    genres TEXT,
    followers INTEGER,
    popularity INTEGER,
    date_added DATE NOT NULL,
    image_id TEXT,
    FOREIGN KEY (image_id) REFERENCES internal_images(id),
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS main.album_artists (
    album_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    FOREIGN KEY (album_id) REFERENCES albums(id),
    FOREIGN KEY (artist_id) REFERENCES artists(id),
    PRIMARY KEY (album_id,artist_id)
);
CREATE TABLE IF NOT EXISTS main.artist_external_images (
    artist_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    FOREIGN KEY (artist_id) REFERENCES artists(id),
    FOREIGN KEY (image_id) REFERENCES external_images(id),
    PRIMARY KEY (artist_id,image_id)
);
CREATE TABLE IF NOT EXISTS main.songs (
    id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    track_number INTEGER NOT NULL,
    disc_number INTEGER NOT NULL,
    popularity INTEGER,
    image_id TEXT,
    path TEXT,
    album_id TEXT NOT NULL,
    date_added DATE NOT NULL,
    isrc TEXT NOT NULL UNIQUE,
    download_url TEXT,
    lyrics TEXT,
    dynamic_lyrics TEXT,
    FOREIGN KEY (image_id) REFERENCES internal_images(id),
    FOREIGN KEY (album_id) REFERENCES albums(id),
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS main.song_artists (
    song_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    FOREIGN KEY (song_id) REFERENCES songs(id),
    FOREIGN KEY (artist_id) REFERENCES artists(id),
    PRIMARY KEY (song_id,artist_id)
);
CREATE TABLE IF NOT EXISTS main.users (
    id TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    current_song_id TEXT,
    current_station TEXT,
    "current_time" INTEGER,
    queue_index INTEGER,
    random_queue BOOLEAN NOT NULL DEFAULT FALSE,
    repeat_song TEXT NOT NULL DEFAULT 'off' CHECK (repeat_song IN ('off', 'one', 'all')),
    volume INTEGER NOT NULL DEFAULT 1,
    cross_fade INTEGER NOT NULL DEFAULT 0,
    lang TEXT NOT NULL DEFAULT 'en',
    admin BOOLEAN NOT NULL DEFAULT FALSE,
    super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    dev_user BOOLEAN NOT NULL DEFAULT FALSE,
    date_added DATE NOT NULL,
    FOREIGN KEY (current_song_id) REFERENCES songs(id),
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS main.user_lists (
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('playlist', 'album')),
    item_id TEXT NOT NULL,
    date_added DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    PRIMARY KEY (user_id,item_type,item_id)
);
CREATE TABLE IF NOT EXISTS main.user_queue_songs (
    user_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    song_id TEXT NOT NULL,
    list_type TEXT NOT NULL CHECK (list_type IN ('album', 'playlist', 'recently-played')),
    list_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (song_id) REFERENCES songs(id),
    PRIMARY KEY (user_id,position,song_id)
);
CREATE TABLE IF NOT EXISTS main.user_pinned_lists (
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('playlist', 'album')),
    item_id TEXT NOT NULL,
    date_added DATE NOT NULL,
    PRIMARY KEY (user_id,item_type,item_id)
);
CREATE TABLE IF NOT EXISTS main.user_liked_songs (
    user_id TEXT NOT NULL,
    song_id TEXT NOT NULL,
    date_added DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (song_id) REFERENCES songs(id),
    PRIMARY KEY (user_id,song_id)
);
CREATE TABLE IF NOT EXISTS main.user_history_songs (
    user_id TEXT NOT NULL,
    song_id TEXT NOT NULL,
    played_at DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (song_id) REFERENCES songs(id),
    PRIMARY KEY (user_id,song_id)
);
CREATE TABLE IF NOT EXISTS main.playlists (
    id TEXT NOT NULL UNIQUE,
    image_id TEXT NOT NULL,
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    followers INTEGER NOT NULL,
    date_added DATE NOT NULL,
    updated_at DATE NOT NULL,
    path TEXT NOT NULL,
    FOREIGN KEY (image_id) REFERENCES internal_images(id),
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS main.playlist_external_images (
    playlist_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id),
    FOREIGN KEY (image_id) REFERENCES external_images(id),
    PRIMARY KEY (playlist_id,image_id)
);
CREATE TABLE IF NOT EXISTS main.playlist_songs (
    playlist_id TEXT NOT NULL,
    song_id TEXT NOT NULL,
    added_by TEXT,
    date_added DATE,
    disabled BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id),
    FOREIGN KEY (song_id) REFERENCES songs(id),
    FOREIGN KEY (added_by) REFERENCES users(id),
    PRIMARY KEY (playlist_id,song_id)
);
CREATE TABLE IF NOT EXISTS main.downloads (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    date_started DATE NOT NULL,
    date_ended DATE,
    download_url TEXT NOT NULL,
    status TEXT NOT NULL,
    seen BOOLEAN NOT NULL DEFAULT FALSE,
    success INTEGER,
    fail INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS main.errors (
    id TEXT NOT NULL UNIQUE,
    msg TEXT,
    source TEXT,
    line_no INTEGER,
    column_no INTEGER,
    error_message TEXT,
    error_cause TEXT,
    error_name TEXT,
    error_stack TEXT,
    user_id TEXT,
    date_added DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    PRIMARY KEY (id)
);