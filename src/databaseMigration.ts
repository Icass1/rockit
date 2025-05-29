import sqlite from "better-sqlite3";
export const db = sqlite("database/test-database.db");

import { db as mainDb } from "./lib/db/db";
import { OldImageDB, RawAlbumDB } from "./lib/db/album";
import { RawSongDB } from "./lib/db/song";
import { RawUserDB } from "./lib/db/user";

db.exec(`
CREATE TABLE IF NOT EXISTS spotify_images (
    id TEXT PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    width INTEGER,
    height INTEGER
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY UNIQUE,
    image TEXT NOT NULL,
    name TEXT NOT NULL,
    release_date DATE NOT NULL,
    popularity INTEGER,
    disc_count INTEGER NOT NULL,
    date_added DATE NOT NULL
)`);
db.exec(`
CREATE TABLE IF NOT EXISTS album_images (
    album_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    FOREIGN KEY (album_id) REFERENCES albums(id),
    FOREIGN KEY (image_id) REFERENCES spotify_images(id),
    PRIMARY KEY (album_id, image_id)
);
`);
db.exec(`
CREATE TABLE IF NOT EXISTS album_artists (
    album_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    FOREIGN KEY (album_id) REFERENCES albums(id),
    FOREIGN KEY (artist_id) REFERENCES artists(id),
    PRIMARY KEY (album_id, artist_id)
);
`);
db.exec(`
CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY UNIQUE,
    name TEXT NOT NULL,
    genres TEXT,
    followers INTEGER,
    popularity INTEGER,
    date_added DATE,
    image TEXT
);
`);
db.exec(`
CREATE TABLE IF NOT EXISTS artist_images (
    artist_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    FOREIGN KEY (artist_id) REFERENCES artists(id),
    FOREIGN KEY (image_id) REFERENCES spotify_images(id),
    PRIMARY KEY (artist_id, image_id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY UNIQUE,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    track_number INTEGER NOT NULL,
    disc_number INTEGER NOT NULL,
    popularity INTEGER,
    image TEXT,
    path TEXT,
    album_id TEXT NOT NULL,
    date_added DATE NOT NULL,
    isrc TEXT UNIQUE NOT NULL,
    download_url TEXT,
    lyrics TEXT,
    dynamic_lyrics TEXT,
    FOREIGN KEY (album_id) REFERENCES albums(id)
)
`);

db.exec(`
CREATE TABLE IF NOT EXISTS song_artists (
    song_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    FOREIGN KEY (song_id) REFERENCES songs(id),
    FOREIGN KEY (artist_id) REFERENCES artists(id),
    PRIMARY KEY (song_id, artist_id)
);    
`);

db.exec(`
CREATE TABLE IF NOT EXISTS downloads (
    id TEXT PRIMARY KEY UNIQUE,
    user_id TEXT NOT NULL,
    date_started DATE NOT NULL,
    date_ended DATE,
    download_url TEXT NOT NULL,
    status TEXT NOT NULL,
    seen BOOLEAN NOT NULL DEFAULT FALSE,
    success INTEGER,
    fail INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
`);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id TEXT NOT NULL UNIQUE PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    current_song TEXT,
    current_station TEXT,
    current_time INTEGER,
    queue_index INTEGER,
    random_queue BOOLEAN DEFAULT 0 NOT NULL,
    repeat_song TEXT DEFAULT "off" NOT NULL CHECK (repeat_song IN ('off', 'one', 'all')),
    volume INTEGER DEFAULT 1 NOT NULL,
    cross_fade INTEGER DEFAULT 0 NOT NULL,
    lang TEXT DEFAULT "en" NOT NULL,
    admin BOOLEAN DEFAULT 0 NOT NULL,
    super_admin BOOLEAN DEFAULT 0 NOT NULL,
    impersonate_id TEXT,
    dev_user BOOLEAN DEFAULT 0 NOT NULL,
    created_at DATE NOT NULL,
    FOREIGN KEY (current_song) REFERENCES songs(id),
    FOREIGN KEY (impersonate_id) REFERENCES users(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS user_lists (
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('playlist', 'album')),
    item_id TEXT NOT NULL,
    created_at DATE NOT NULL,
    PRIMARY KEY (user_id, item_type, item_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS user_queue (
    user_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    song_id TEXT NOT NULL,
    list_type TEXT CHECK(list_type IN ('album', 'playlist', 'recently-played')),
    list_id TEXT NOT NULL,
    PRIMARY KEY (user_id, song_id, position),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (song_id) REFERENCES songs(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS user_pinned_lists (
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('playlist', 'album')),
    item_id TEXT NOT NULL,
    created_at DATE NOT NULL,
    PRIMARY KEY (user_id, item_type, item_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS user_liked_songs (
    user_id TEXT NOT NULL,
    created_at DATE,
    song_id TEXT NOT NULL,
    PRIMARY KEY (user_id, song_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (song_id) REFERENCES songs(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS user_song_history (
    user_id TEXT NOT NULL,
    song_id TEXT NOT NULL,
    played_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (song_id) REFERENCES songs(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS session (
    id TEXT NOT NULL PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS error (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    msg TEXT,
    source TEXT,
    line_no INTEGER,
    column_no INTEGER,
    error_message TEXT,
    error_cause TEXT,
    error_name TEXT,
    error_stack TEXT,
    date_added DATE,
    user_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

export interface RawArtistDB {
    id: string;
    images: string;
    name: string;
    genres: string;
    followers: number;
    popularity: number;
    type: string;
    dateAdded: string;
    image: object;
}

const albums: RawAlbumDB[] = mainDb
    .prepare("SELECT * FROM album")
    .all() as RawAlbumDB[];
const artists: RawArtistDB[] = mainDb
    .prepare("SELECT * FROM artist")
    .all() as RawArtistDB[];
const songs: RawSongDB[] = mainDb
    .prepare("SELECT * FROM song")
    .all() as RawSongDB[];

const users: RawUserDB[] = mainDb
    .prepare("SELECT * FROM user")
    .all() as RawUserDB[];

const missingArtists: string[] = [];
const songsMissingIsrc: string[] = [];
const missingAlbums: string[] = [];

artists.forEach((artistDB) => {
    // console.log({ artistDB });

    try {
        db.prepare(
            "INSERT INTO artists (id, name, genres, followers, popularity, date_added, image) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(
            artistDB.id,
            artistDB.name,
            artistDB.genres,
            artistDB.followers,
            artistDB.popularity,
            new Date(artistDB.dateAdded).toISOString().split("T")[0],
            JSON.stringify(artistDB.image)
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.toString().includes("UNIQUE constraint failed: artists.id")) {
            // Artist already exists, skip
            return;
        } else {
            console.log("Error inserting artist:", artistDB.id, error);
        }
    }

    const images: OldImageDB[] = JSON.parse(artistDB.images);

    images.forEach((image) => {
        const { url, width, height } = image;

        const id = url.replace("https://i.scdn.co/image/", "");

        db.prepare(
            "INSERT INTO spotify_images (id, url, width, height) VALUES (?, ?, ?, ?)"
        ).run(id, url, width, height);

        db.prepare(
            "INSERT INTO artist_images (artist_id, image_id) VALUES (?, ?)"
        ).run(artistDB.id, id);
    });
});

albums.forEach((albumDB) => {
    // console.log({ albumDB });
    const images: OldImageDB[] = JSON.parse(albumDB.images);

    try {
        db.prepare(
            "INSERT INTO albums (id, image, name, release_date, popularity, disc_count, date_added) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(
            albumDB.id,
            albumDB.image,
            albumDB.name,
            albumDB.releaseDate,
            albumDB.popularity,
            albumDB.discCount,
            new Date(albumDB.dateAdded).toISOString().split("T")[0]
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.toString().includes("UNIQUE constraint failed: albums.id")) {
            // Artist already exists, skip
            return;
        } else {
            console.log("Error inserting album:", albumDB.id, error);
        }
    }

    const artists = JSON.parse(albumDB.artists);

    artists.forEach((artist: { id: string }) => {
        try {
            db.prepare(
                "INSERT INTO album_artists (album_id, artist_id) VALUES (?, ?)"
            ).run(albumDB.id, artist.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.toString().includes("FOREIGN KEY constraint failed")) {
                missingArtists.push(artist.id);

                return;
            } else {
                console.log("Error inserting album artist:", {
                    albumId: albumDB.id,
                    artist,
                    error,
                });
            }
        }
    });

    images.forEach((image) => {
        const { url, width, height } = image;

        const id = url.replace("https://i.scdn.co/image/", "");

        try {
            db.prepare(
                "INSERT INTO spotify_images (id, url, width, height) VALUES (?, ?, ?, ?)"
            ).run(id, url, width, height);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (
                error
                    .toString()
                    .includes("UNIQUE constraint failed: spotify_images.url")
            ) {
            } else {
                console.log("Error inserting spotify_images:", {
                    albumId: albumDB.id,
                    image: image,
                    error,
                });
            }
        }

        db.prepare(
            "INSERT INTO album_images (album_id, image_id) VALUES (?, ?)"
        ).run(albumDB.id, id);
    });
});

songs.forEach((songDB) => {
    try {
        db.prepare(
            "INSERT INTO songs (id, name, duration, track_number, disc_number, popularity, image, path, album_id, date_added, isrc, download_url, lyrics, dynamic_lyrics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
            songDB.id,
            songDB.name,
            songDB.duration,
            songDB.trackNumber,
            songDB.discNumber,
            songDB.popularity,
            songDB.image,
            songDB.path,
            songDB.albumId,
            new Date(
                (Number(songDB.dateAdded) as number) || NaN
                    ? Number(songDB.dateAdded)
                    : songDB.dateAdded
            )
                .toISOString()
                .split("T")[0],
            songDB.isrc,
            songDB.downloadUrl,
            songDB.lyrics,
            songDB.dynamicLyrics
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.toString().includes("UNIQUE constraint failed: songs.id")) {
        } else if (
            error.toString().includes("UNIQUE constraint failed: songs.isrc")
        ) {
        } else if (
            error.toString().includes("NOT NULL constraint failed: songs.isrc")
        ) {
            songsMissingIsrc.push(songDB.id);
        } else if (error.toString().includes("FOREIGN KEY constraint failed")) {
            missingAlbums.push(songDB.albumId);
        } else {
            console.log({ songDB });
            console.log("Error inserting song:", songDB.id, error);
        }
    }

    const artists = JSON.parse(songDB.artists);
    artists.forEach((artist: { id: string }) => {
        try {
            db.prepare(
                "INSERT INTO song_artists (song_id, artist_id) VALUES (?, ?)"
            ).run(songDB.id, artist.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.toString().includes("FOREIGN KEY constraint failed")) {
                missingArtists.push(artist.id);
            } else {
                console.log("Error inserting song artist:", error);
            }
        }
    });
});

export interface Queue {
    song: string;
    index: number;
    list: List;
}

export interface List {
    type: string;
    id: string;
}

users.forEach((userDB) => {
    try {
        db.prepare(
            "INSERT INTO users (id, username, password_hash, current_song, current_station, current_time, queue_index, random_queue, repeat_song, volume, cross_fade, lang, admin, super_admin, impersonate_id, dev_user, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
            userDB.id,
            userDB.username,
            userDB.passwordHash,
            userDB.currentSong,
            userDB.currentStation,
            userDB.currentTime,
            userDB.queueIndex,
            userDB.randomQueue,
            userDB.repeatSong,
            userDB.volume,
            userDB.crossFade,
            userDB.lang,
            userDB.admin,
            userDB.superAdmin,
            null,
            userDB.devUser,
            new Date(userDB.createdAt).toISOString().split("T")[0]
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (
            error
                .toString()
                .includes("UNIQUE constraint failed: users.username")
        ) {
        } else {
            console.log("Error inserting user:", { userDB, error });
        }
    }

    const queue: Queue[] = JSON.parse(userDB.queue);

    queue.forEach((item) => {
        try {
            db.prepare(
                "INSERT INTO user_queue (user_id, position, song_id, list_type, list_id) VALUES (?, ?, ?, ?, ?)"
            ).run(
                userDB.id,
                item.index,
                item.song,
                item.list.type,
                item.list.id
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (
                error
                    .toString()
                    .includes(
                        "UNIQUE constraint failed: user_queue.user_id, user_queue.song_id, user_queue.position"
                    )
            ) {
            } else {
                console.log("Error inserting user queue:", {
                    userId: userDB.id,
                    item,
                    error,
                });
            }
        }
    });
});

console.log(
    "missing artists:",
    missingArtists.reduce((acc: string[], id) => {
        if (!acc.includes(id)) {
            acc.push(id);
        }
        return acc;
    }, [])
);

console.log(
    "missing albums:",
    missingAlbums.reduce((acc: string[], id) => {
        if (!acc.includes(id)) {
            acc.push(id);
        }
        return acc;
    }, [])
);

console.log(
    "songsMissingIsrc:",
    songsMissingIsrc.reduce((acc: string[], id) => {
        if (!acc.includes(id)) {
            acc.push(id);
        }
        return acc;
    }, [])
);
