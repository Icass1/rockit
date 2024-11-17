import sqlite from "better-sqlite3";
export const db = sqlite("database/database.db");

db.exec(`CREATE TABLE IF NOT EXISTS session (
    id TEXT NOT NULL PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
)`);

export interface UserDB {
    id: string
    username: string
    passwordHash: string
    lists: string
    lastPlayedSong: string | undefined
    currentList: string | undefined
    currentSong: string | undefined
    currentTime: number | undefined
    queue: string
    queueIndex: number | undefined
    randomQueue: string
    volume: number
    admin: string
    superAdmin: string
    devUser: string
    showLyrics: string
    updatedAt: number
    createdAt: number
}

db.exec(`CREATE TABLE IF NOT EXISTS user (
    id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL UNIQUE,
    lists TEXT DEFAULT "[]" NOT NULL,
    lastPlayedSong TEXT,
    currentList TEXT,
    currentSong TEXT,
    currentTime INTEGER,
    queue TEXT DEFAULT "[]" NOT NULL,
    queueIndex INTEGER,
    randomQueue BOOLEAN DEFAULT 0 NOT NULL,
    volume INTEGER DEFAULT 1 NOT NULL,
    admin BOOLEAN DEFAULT 0 NOT NULL,
    superAdmin BOOLEAN DEFAULT 0 NOT NULL,
    devUser BOOLEAN DEFAULT 0 NOT NULL,
    showLyrics BOOLEAN DEFAULT 0 NOT NULL,
    updatedAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL
)`);

export interface SongDB {
    id: string
    name: string
    artists: string
    genres: string
    discNumber: number | undefined
    albumName: string
    albumArtist: string
    albumType: string
    albumId: string
    duration: number
    year: number
    date: string
    trackNumber: number | undefined
    tracksCount: number | undefined
    publisher: string | undefined
    path: string
    images: string
    copyright: string | undefined
    downloadUrl: string | undefined
    lyrics: string | undefined
    popularity: number | undefined
    dateAdded: string | undefined
}

db.exec(`CREATE TABLE IF NOT EXISTS song (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    name TEXT NOT NULL,
    artists TEXT NOT NULL,
    genres TEXT NOT NULL,
    discNumber INTEGER,
    albumName TEXT NOT NULL,
    albumArtist TEXT NOT NULL,
    albumType TEXT NOT NULL,
    albumId TEXT NOT NULL,
    duration INTEGER NOT NULL,
    year INTEGER NOT NULL,
    date TEXT NOT NULL,
    trackNumber INTEGER,
    tracksCount INTEGER,
    publisher TEXT,
    path TEXT NOT NULL,
    images TEXT NOT NULL,
    copyright TEXT,
    downloadUrl TEXT,
    lyrics TEXT,
    popularity INTEGER,
    dateAdded TEXT
)`);

export interface PlaylistDB {
    id: string
    images: string
    name: string
    description: string
    owner: string
    followers: number
    songs: string
}

db.exec(`CREATE TABLE IF NOT EXISTS playlist (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    images TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    owner TEXT NOT NULL,
    followers INTEGER NOT NULL,
    songs TEXT NOT NULL 
)`);

export interface AlbumDB {
    id: string
    type: string
    images: string
    name: string
    releaseDate: string
    artists: string
    copyrights: string
    popularity: number
    genres: string
    songs: string
    discCount: number
    dateAdded: number
}
db.exec(`CREATE TABLE IF NOT EXISTS album (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    type TEXT NOT NULL,
    images TEXT NOT NULL,
    name TEXT NOT NULL,
    releaseDate TEXT NOT NULL,
    artists TEXT NOT NULL,
    copyrights TEXT NOT NULL,
    popularity INTEGER NOT NULL,
    genres TEXT NOT NULL,
    songs TEXT NOT NULL,
    discCount INTEGER NOT NULL,
    dateAdded INTEGER NOT NULL
)`);
