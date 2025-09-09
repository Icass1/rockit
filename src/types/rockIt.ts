// ****************************************
// ************** Song stuff **************
// ****************************************

export type RockItExternalImage = {
    url: string;
    width?: number;
    height?: number;
};

export type DynamicLyrics = {
    lyrics: string;
    seconds: number;
};

export interface RockItArtist {
    public_id: string;
    name: string;
}

export interface RockItCopyright {
    text: string;
    type: "C" | "P";
}

export interface RockItAlbum {
    public_id: string;
    name: string;
    copyrights: RockItCopyright[];
}

export type RockItSong<Keys extends keyof SongDBFull = keyof SongDBFull> = Pick<
    SongDBFull,
    Keys
>;
export interface SongDBFull {
    publicId: string;
    name: string;
    artists: RockItArtist[];
    genres: string[];
    discNumber: number;
    album: RockItAlbum;
    duration: number;
    trackNumber: number;
    publisher: string;
    images: RockItExternalImage[];
    internalImageUrl?: string;
    downloadUrl?: string;
    lyrics: string;
    dynamicLyrics: DynamicLyrics[];
    popularity?: number;
    dateAdded: string;
    isrc: string;
}
