export const songQuery = `
CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY UNIQUE,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    track_number INTEGER NOT NULL,
    disc_number INTEGER NOT NULL,
    popularity INTEGER,
    image TEXT,
    path TEXT,
    album_id INTEGER NOT NULL,
    date_added DATE NOT NULL,
    isrc TEXT UNIQUE NOT NULL,
    download_url TEXT,
    lyrics TEXT,
    dynamic_lyrics TEXT,
    FOREIGN KEY (album_id) REFERENCES albums(id)
);

CREATE TABLE IF NOT EXISTS song_artists (
    song_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    FOREIGN KEY (song_id) REFERENCES songs(id),
    FOREIGN KEY (artist_id) REFERENCES artists(id),
    PRIMARY KEY (song_id, artist_id)
)
`;
