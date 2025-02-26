// ********************************************
// ************** Playlist stuff **************
// ********************************************

export type OldImageDB = {
    url: string;
    width: number;
    height: number;
};

export type ArtistDB = {
    name: string;
    id: string;
};

import type { SongDB, SongDBFull } from "./song";

export type PlaylistDB<
    Keys extends keyof PlaylistDBFull = keyof PlaylistDBFull,
> = Pick<PlaylistDBFull, Keys>;

export interface RawPlaylistDB {
    id: string;
    images: string;
    image: string;
    name: string;
    description: string;
    owner: string;
    followers: number;
    songs: string;
}

export interface PlaylistDBFull {
    id: string;
    images: OldImageDB[];
    image: string;
    name: string;
    description: string;
    owner: string;
    followers: number;
    songs: PlaylistDBSong[];
}

export interface PlaylistDBSong {
    id: string;
    added_at?: string;
}

export type PlaylistDBSongWithAddedAt<
    Keys extends keyof SongDBFull = keyof SongDBFull,
> = SongDB<Keys> & {
    added_at?: string;
};

export function parsePlaylist(
    playlist: RawPlaylistDB | undefined
): PlaylistDB | undefined {
    if (!playlist) return undefined;

    return {
        id: playlist.id,
        images: JSON.parse(playlist.images || "[]"),
        image: playlist.image,
        name: playlist.name,
        description: playlist.description,
        owner: playlist.owner,
        followers: playlist.followers,
        songs: JSON.parse(playlist.songs || "[]"),
    };
}

export const playlistQuery = `CREATE TABLE IF NOT EXISTS playlist (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    images TEXT NOT NULL,
    image TEXT NOT NULL  DEFAULT "",
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    owner TEXT NOT NULL,
    followers INTEGER NOT NULL,
    songs TEXT NOT NULL 
)`;
