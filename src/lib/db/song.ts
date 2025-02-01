// ****************************************
// ************** Song stuff **************
// ****************************************

export type OldImageDB = {
    url: string;
    width: number;
    height: number;
};

export type ArtistDB = {
    name: string;
    id: string;
};
export interface RawSongDB {
    id: string;
    name: string;
    artists: string;
    genres: string;
    discNumber: number | undefined;
    albumName: string;
    albumArtist: string;
    albumType: string;
    albumId: string;
    duration: number;
    date: string;
    trackNumber: number | undefined;
    publisher: string | undefined;
    path: string | undefined;
    images: string;
    image: string;
    copyright: string | undefined;
    downloadUrl: string | undefined;
    lyrics: string | undefined;
    popularity: number | undefined;
    dateAdded: string | undefined;
}

export type SongDB<Keys extends keyof SongDBFull = keyof SongDBFull> = Pick<
    SongDBFull,
    Keys
>;
export type SongDBFull = {
    id: string;
    name: string;
    artists: ArtistDB[];
    genres: string[];
    discNumber: number | undefined;
    albumName: string;
    albumArtist: ArtistDB[];
    albumType: string;
    albumId: string;
    duration: number;
    date: string;
    trackNumber: number | undefined;
    publisher: string | undefined;
    path: string | undefined;
    images: OldImageDB[];
    image: string | undefined;
    copyright: string | undefined;
    downloadUrl: string | undefined;
    lyrics: string | undefined;
    popularity: number | undefined;
    dateAdded: string | undefined;
};

export function parseSong(rawSong: RawSongDB | undefined): SongDB | undefined {
    if (!rawSong) {
        return undefined;
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
        date: rawSong.date,
        trackNumber: rawSong.trackNumber,
        publisher: rawSong.publisher,
        path: rawSong.path,
        images: JSON.parse(rawSong.images || "[]"),
        image: rawSong.image,
        copyright: rawSong.copyright,
        downloadUrl: rawSong.downloadUrl,
        lyrics: rawSong.lyrics,
        popularity: rawSong.popularity,
        dateAdded: rawSong.dateAdded,
    };
}

export const songQuery = `CREATE TABLE IF NOT EXISTS song (
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
    date TEXT NOT NULL,
    trackNumber INTEGER,
    publisher TEXT,
    path TEXT,
    images TEXT NOT NULL,
    image TEXT NOT NULL  DEFAULT "",
    copyright TEXT,
    downloadUrl TEXT,
    lyrics TEXT,
    popularity INTEGER,
    dateAdded TEXT
)`;
