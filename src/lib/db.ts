import sqlite from "better-sqlite3";
export const db = sqlite("database/database.db");

db.exec(`CREATE TABLE IF NOT EXISTS session (
    id TEXT NOT NULL PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
)`);

// ****************************************
// ************** User stuff **************
// ****************************************

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

// ****************************************
// ************** Song stuff **************
// ****************************************

export interface RawSongDB {
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
    path: string | undefined
    images: string
    copyright: string | undefined
    downloadUrl: string | undefined
    lyrics: string | undefined
    popularity: number | undefined
    dateAdded: string | undefined
}

export type SongDB = {
    id: string
    name: string
    artists: DBArtist[]
    genres: string
    discNumber: number | undefined
    albumName: string
    albumArtist: DBArtist[]
    albumType: string
    albumId: string
    duration: number
    year: number
    date: string
    trackNumber: number | undefined
    tracksCount: number | undefined
    publisher: string | undefined
    path: string | undefined
    images: DBImage[]
    copyright: string | undefined
    downloadUrl: string | undefined
    lyrics: string | undefined
    popularity: number | undefined
    dateAdded: string | undefined
}
export type DBImage = {
    url: string
    width: number
    height: number
}
export type DBArtist = {
    name: string
    id: string
}

export function parseSong(rawSong: RawSongDB | undefined): SongDB | undefined {

    if (!rawSong) {
        return undefined
    }

    return {
        id: rawSong.id,
        name: rawSong.name,
        artists: JSON.parse(rawSong.artists),
        genres: JSON.parse(rawSong.genres),
        discNumber: rawSong.discNumber,
        albumName: rawSong.albumName,
        albumArtist: JSON.parse(rawSong.albumArtist),
        albumType: rawSong.albumType,
        albumId: rawSong.albumId,
        duration: rawSong.duration,
        year: rawSong.year,
        date: rawSong.date,
        trackNumber: rawSong.discNumber,
        tracksCount: rawSong.discNumber,
        publisher: rawSong.publisher,
        path: rawSong.path,
        images: JSON.parse(rawSong.images),
        copyright: rawSong.copyright,
        downloadUrl: rawSong.downloadUrl,
        lyrics: rawSong.lyrics,
        popularity: rawSong.discNumber,
        dateAdded: rawSong.dateAdded
    }
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
    path TEXT,
    images TEXT NOT NULL,
    copyright TEXT,
    downloadUrl TEXT,
    lyrics TEXT,
    popularity INTEGER,
    dateAdded TEXT
)`);

// ********************************************
// ************** Playlist stuff **************
// ********************************************
export interface RawPlaylistDB {
    id: string
    images: string
    name: string
    description: string
    owner: string
    followers: number
    songs: string
}

export interface PlaylistDB {
    id: string
    images: DBImage[]
    name: string
    description: string
    owner: string
    followers: number
    songs: PlaylistDBSong[]
}

export interface PlaylistDBSong {
    id: string
    added_at: string
}

export function parsePlaylist(playlist: RawPlaylistDB | undefined): PlaylistDB | undefined {

    if (!playlist) return undefined

    return {
        id: playlist.id,
        images: JSON.parse(playlist.images),
        name: playlist.name,
        description: playlist.description,
        owner: playlist.owner,
        followers: playlist.followers,
        songs: JSON.parse(playlist.songs)
    }
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

// *****************************************
// ************** Album stuff **************
// *****************************************

export interface RawAlbumDB {
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
export interface AlbumDB {
    id: string
    type: string
    images: DBImage[]
    name: string
    releaseDate: string
    artists: DBArtist[]
    copyrights: AlbumDBCopyright[]
    popularity: number
    genres: string[]
    songs: string[]
    discCount: number
    dateAdded: number
}

export interface AlbumDBCopyright {
    text: string
    type: string
}

export function parseAlbum(album: RawAlbumDB | undefined): AlbumDB | undefined {

    if (!album) {
        return undefined
    }


    return {
        id: album.id,
        type: album.type,
        images: JSON.parse(album.images),
        name: album.name,
        releaseDate: album.releaseDate,
        artists: JSON.parse(album.artists),
        copyrights: JSON.parse(album.copyrights),
        popularity: album.popularity,
        genres: JSON.parse(album.genres),
        songs: JSON.parse(album.songs),
        discCount: album.discCount,
        dateAdded: album.dateAdded
    }
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
