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
    images: string | undefined;
    image: string;
    name: string;
    description: string;
    owner: string;
    followers: number;
    songs: string;
    updatedAt: string | undefined;
    createdAt: string | undefined;
}

export interface PlaylistDBFull {
    id: string;
    images: OldImageDB[] | undefined;
    image: string;
    name: string;
    description: string;
    owner: string;
    followers: number;
    songs: PlaylistDBSong[];
    updatedAt: string | undefined;
    createdAt: string | undefined;
}

export interface PlaylistDBSong {
    id: string;
    added_at?: string;
    addedInRockit?: boolean | undefined;
}

export type PlaylistDBSongWithAddedAt<
    Keys extends keyof SongDBFull = keyof SongDBFull,
> = SongDB<Keys> & {
    added_at?: string;
};

export function parse1Playlist(
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
        updatedAt: playlist.updatedAt,
        createdAt: playlist.createdAt,
    };
}

export const playlistQuery = `CREATE TABLE IF NOT EXISTS playlist (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    images TEXT,
    image TEXT NOT NULL DEFAULT "",
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    owner TEXT NOT NULL,
    followers INTEGER NOT NULL,
    songs TEXT NOT NULL,
    updatedAt TEXT,
    createdAt TEXT
)`;
