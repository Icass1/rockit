export interface RockItAlbum {
    id: string;
    type: string;
    images: RockItAlbumImage[];
    image: string;
    name: string;
    releaseDate: string;
    artists: RockItAlbumArtist[];
    copyrights: RockItAlbumCopyright[];
    popularity: number;
    genres: any[];
    songs: RockItAlbumSong[];
    discCount: number;
    dateAdded: number;
}

export interface RockItAlbumImage {
    url: string;
    height: number;
    width: number;
}

export interface RockItAlbumArtist {
    name: string;
    id: string;
}

export interface RockItAlbumCopyright {
    text: string;
    type: string;
}

export interface RockItAlbumSong {
    id: string;
    name: string;
    artists: RockItAlbumArtist2[];
    genres: string[];
    discNumber: number;
    albumName: string;
    albumArtist: RockItAlbumAlbumArtist[];
    albumType: string;
    albumId: string;
    duration: number;
    date: string;
    trackNumber: number;
    publisher: string;
    path: string;
    images: RockItAlbumImage2[];
    image: string;
    copyright: string;
    downloadUrl: string;
    lyrics?: string;
    popularity: number;
    dateAdded: string;
}

export interface RockItAlbumArtist2 {
    name: string;
    id: string;
}

export interface RockItAlbumAlbumArtist {
    name: string;
    id: string;
}

export interface RockItAlbumImage2 {
    url: string;
    height: number;
    width: number;
}
