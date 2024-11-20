import sqlite from "better-sqlite3";
import * as fs from 'fs'

fs.mkdir("database", { recursive: false }, () => { })
export const db = sqlite("database/database.db");

interface Column {
    cid: number,
    name: string,
    type: string,
    notnull: number,
    dflt_value: null | string,
    pk: number
}

function getDifference(listA: Column[], listB: Column[]) {
    let addedColumns: string[] = []
    let removedColumns: string[] = []
    let modifiedColumns: { name: string, param: string, previous: string | null | number, next: string | null | number }[] = []

    listA.map(columnA => {
        let columnB = listB.find(columnB => columnA.name == columnB.name)
        if (columnB == undefined) {
            removedColumns.push(columnA.name)
            return
        }
        if (columnA.dflt_value != columnB?.dflt_value) {
            modifiedColumns.push({ name: columnA.name, param: "dflt_value", previous: columnA.dflt_value, next: columnB?.dflt_value })
        }
        if (columnA.pk != columnB?.pk) {
            modifiedColumns.push({ name: columnA.name, param: "pk", previous: columnA.pk, next: columnB?.pk })
        }
        if (columnA.type != columnB?.type) {
            modifiedColumns.push({ name: columnA.name, param: "type", previous: columnA.type, next: columnB?.type })
        }
        if (columnA.notnull != columnB?.notnull) {
            modifiedColumns.push({ name: columnA.name, param: "notnull", previous: columnA.notnull, next: columnB?.notnull })
        }
    })

    listB.map(columnB => {
        let columnA = listA.find(columnA => columnA.name == columnB.name)
        if (columnA == undefined) {
            addedColumns.push(columnB.name)
            return
        }
    })

    return { modifiedColumns, removedColumns, addedColumns }

}

function checkTable(tableName: string, query: string, existingColumns: Column[]) {

    let columns = query.split("(")[1].split(")")[0].replaceAll("\n", "").split(",")
    columns = columns.map(column => {
        while (column.startsWith(" ")) {
            column = column.replace(" ", "")
        }
        return column
    })
    const newColumns = columns.map((column, index): Column => {
        const columnSplit = column.split(" ")
        return {
            cid: index,
            name: columnSplit[0],
            type: columnSplit[1],
            notnull: column.includes("NOT NULL") ? 1 : 0,
            dflt_value: columnSplit.indexOf("DEFAULT") != -1 ? columnSplit[columnSplit.indexOf("DEFAULT") + 1] : null,
            pk: column.includes("PRIMARY KEY") ? 1 : 0
        }

    })

    const { modifiedColumns, addedColumns, removedColumns } = getDifference(existingColumns, newColumns)

    if (modifiedColumns.length > 0) {
        console.warn("Detected column change(s).", modifiedColumns)
    }

    if (removedColumns.length > 0) {
        console.warn("Detected removed column(s).", removedColumns)
    }

    if (addedColumns.length > 0) {
        console.warn("Detected new column(s).", addedColumns)
        addedColumns.map(column => {
            const newColumn = newColumns.find(_column => _column.name == column)
            if (!newColumn) {
                return console.error("Fatal, new column is not defined")
            }

            query = `${newColumn.name} ${newColumn.type} ${newColumn.dflt_value ? 'DEFAULT ' + newColumn.dflt_value : ''} ${newColumn.notnull ? 'NOT NULL' : ''}`
            console.log(column, newColumn)
            console.log(query)
            db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${query}`)
        })
    }
}

db.exec(`CREATE TABLE IF NOT EXISTS session (
    id TEXT NOT NULL PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
)`);

// ****************************************
// ************** User stuff **************
// ****************************************

export interface RawUserDB {
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

interface UserDBLastPlayedSong {
    id: string
    date: number
}

export type UserDB<Keys extends keyof UserDBFull = keyof UserDBFull> = Pick<UserDBFull, Keys>;
export interface UserDBFull {
    id: string
    username: string
    passwordHash: string
    lists: string[]
    lastPlayedSong: UserDBLastPlayedSong[] | undefined
    currentList: string | undefined
    currentSong: string | undefined
    currentTime: number | undefined
    queue: string[]
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

const userQuery = `CREATE TABLE IF NOT EXISTS user (
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
    pinnedLists TEXT DEFAULT "[]" NOT NULL,
    randomQueue BOOLEAN DEFAULT 0 NOT NULL,
    volume INTEGER DEFAULT 1 NOT NULL,
    admin BOOLEAN DEFAULT 0 NOT NULL,
    superAdmin BOOLEAN DEFAULT 0 NOT NULL,
    devUser BOOLEAN DEFAULT 0 NOT NULL,
    showLyrics BOOLEAN DEFAULT 0 NOT NULL,
    updatedAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL
)`

export function parseUser(user: RawUserDB | undefined): UserDB | undefined {

    if (!user) {
        return undefined
    }

    return {
        id: user.id,
        username: user.username,
        passwordHash: user.passwordHash,
        lists: JSON.parse(user.lists|| "[]"),
        lastPlayedSong: user.lastPlayedSong ? JSON.parse(user.lastPlayedSong|| "[]") : undefined,
        currentList: user.currentList,
        currentSong: user.currentSong,
        currentTime: user.currentTime,
        queue: JSON.parse(user.queue|| "[]"),
        queueIndex: user.queueIndex,
        randomQueue: user.randomQueue,
        volume: user.volume,
        admin: user.admin,
        superAdmin: user.superAdmin,
        devUser: user.devUser,
        showLyrics: user.showLyrics,
        updatedAt: user.updatedAt,
        createdAt: user.createdAt
    }
}

checkTable("user", userQuery, db.prepare("PRAGMA table_info(user)").all() as Column[])
db.exec(userQuery);

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



export type SongDB<Keys extends keyof SongDBFull = keyof SongDBFull> = Pick<SongDBFull, Keys>;
export type SongDBFull = {
    id: string
    name: string
    artists: ArtistDB[]
    genres: string
    discNumber: number | undefined
    albumName: string
    albumArtist: ArtistDB[]
    albumType: string
    albumId: string
    duration: number
    year: number
    date: string
    trackNumber: number | undefined
    tracksCount: number | undefined
    publisher: string | undefined
    path: string | undefined
    images: ImageDB[]
    copyright: string | undefined
    downloadUrl: string | undefined
    lyrics: string | undefined
    popularity: number | undefined
    dateAdded: string | undefined
}
export type ImageDB = {
    url: string
    width: number
    height: number
}
export type ArtistDB = {
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
        artists: JSON.parse(rawSong.artists || "[]"),
        genres: JSON.parse(rawSong.genres || "[]"),
        discNumber: rawSong.discNumber,
        albumName: rawSong.albumName,
        albumArtist: JSON.parse(rawSong.albumArtist || "[]"),
        albumType: rawSong.albumType,
        albumId: rawSong.albumId,
        duration: rawSong.duration,
        year: rawSong.year,
        date: rawSong.date,
        trackNumber: rawSong.trackNumber,
        tracksCount: rawSong.tracksCount,
        publisher: rawSong.publisher,
        path: rawSong.path,
        images: JSON.parse(rawSong.images || "[]"),
        copyright: rawSong.copyright,
        downloadUrl: rawSong.downloadUrl,
        lyrics: rawSong.lyrics,
        popularity: rawSong.popularity,
        dateAdded: rawSong.dateAdded
    }
}

const songQuery = `CREATE TABLE IF NOT EXISTS song (
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
)`;

checkTable("song", songQuery, db.prepare("PRAGMA table_info(song)").all() as Column[])
db.exec(songQuery);

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
    images: ImageDB[]
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

const playlistQuery = `CREATE TABLE IF NOT EXISTS playlist (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    images TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    owner TEXT NOT NULL,
    followers INTEGER NOT NULL,
    songs TEXT NOT NULL 
)`;

checkTable("playlist", playlistQuery, db.prepare("PRAGMA table_info(playlist)").all() as Column[])
db.exec(playlistQuery);

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
    images: ImageDB[]
    name: string
    releaseDate: string
    artists: ArtistDB[]
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

const albumQuery = `CREATE TABLE IF NOT EXISTS album (
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
)`;

checkTable("album", albumQuery, db.prepare("PRAGMA table_info(album)").all() as Column[])
db.exec(albumQuery);