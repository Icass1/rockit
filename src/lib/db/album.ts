// *****************************************
// ************** Album stuff **************
// *****************************************

import {
    checkTable,
    db,
    type ArtistDB,
    type Column,
    type OldImageDB,
} from "@/db/db";

export type AlbumDB<Keys extends keyof AlbumDBFull = keyof AlbumDBFull> = Pick<
    AlbumDBFull,
    Keys
>;

export interface RawAlbumDB {
    id: string;
    type: string;
    images: string;
    image: string;
    name: string;
    releaseDate: string;
    artists: string;
    copyrights: string;
    popularity: number;
    genres: string;
    songs: string;
    discCount: number;
    dateAdded: number;
}
export interface AlbumDBFull {
    id: string;
    type: string;
    images: OldImageDB[];
    image: string;
    name: string;
    releaseDate: string;
    artists: ArtistDB[];
    copyrights: AlbumDBCopyright[];
    popularity: number;
    genres: string[];
    songs: string[];
    discCount: number;
    dateAdded: number | undefined;
}

export interface AlbumDBCopyright {
    text: string;
    type: string;
}

export function parseAlbum(album: RawAlbumDB | undefined): AlbumDB | undefined {
    if (!album) {
        return undefined;
    }
    return {
        id: album.id,
        type: album.type,
        images: JSON.parse(album.images || "[]"),
        image: album.image,
        name: album.name,
        releaseDate: album.releaseDate,
        artists: JSON.parse(album.artists || "[]"),
        copyrights: JSON.parse(album.copyrights || "[]"),
        popularity: album.popularity,
        genres: JSON.parse(album.genres || "[]"),
        songs: JSON.parse(album.songs || "[]"),
        discCount: album.discCount,
        dateAdded: album.dateAdded,
    };
}

const albumQuery = `CREATE TABLE IF NOT EXISTS album (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    type TEXT NOT NULL,
    images TEXT NOT NULL,
    image TEXT NOT NULL DEFAULT "",
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

checkTable(
    "album",
    albumQuery,
    db.prepare("PRAGMA table_info(album)").all() as Column[]
);
db.exec(albumQuery);
