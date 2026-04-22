import type { BaseArtistResponse } from "@rockit/shared";

export interface LocalSong {
    type: "song";
    provider: string;
    publicId: string;
    providerUrl: string;
    name: string;
    artists: BaseArtistResponse[];
    audioSrc: string | null;
    downloaded: boolean;
    imageUrl: string;
    duration_ms: number;
    discNumber: number;
    trackNumber: number;
    album: {
        type: "album";
        provider: string;
        publicId: string;
        url: string;
        providerUrl: string;
        name: string;
        artists: BaseArtistResponse[];
        releaseDate: string;
        imageUrl: string;
    };
}

export interface LocalAlbum {
    type: "album";
    provider: string;
    publicId: string;
    url: string;
    providerUrl: string;
    name: string;
    artists: BaseArtistResponse[];
    releaseDate: string;
    imageUrl: string;
}

export interface LocalPlaylist {
    type: "playlist";
    provider: string;
    publicId: string;
    name: string;
    imageUrl: string | null;
    songs: LocalSong[];
    isShared: boolean;
    createdAt: string;
}

export interface LocalUser {
    id: number;
    username: string;
    lang: string;
    crossfade: number;
    randomQueue: boolean;
    repeatMode: string;
}