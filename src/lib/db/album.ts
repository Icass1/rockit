// *****************************************
// ************** Album stuff **************
// *****************************************

export type AlbumDB<Keys extends keyof AlbumDBFull = keyof AlbumDBFull> = Pick<
    AlbumDBFull,
    Keys
>;

export type OldImageDB = {
    url: string;
    width: number;
    height: number;
};

export type ArtistDB = {
    name: string;
    id: string;
};

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
    type: "album";
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
        type: "album" as const,
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

export const albumQuery = `CREATE TABLE IF NOT EXISTS album (
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
