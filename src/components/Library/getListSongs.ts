"use client";

import { PlaylistDB } from "@/lib/db/playlist";
import { AlbumDB } from "@/lib/db/album";
import { SongDB } from "@/lib/db/song";

export async function getListSongs(
    list: PlaylistDB<"type" | "songs"> | AlbumDB<"type" | "songs">
) {
    if (list.type == "playlist") {
        const response = await fetch(
            `/api/songs1?songs=${list.songs
                .map((song) => song.id)
                .join()}&p=id,image,name,artists,path,duration,albumName,albumId`
        );
        const songs = (await response.json()) as SongDB<
            | "id"
            | "image"
            | "name"
            | "artists"
            | "path"
            | "duration"
            | "albumName"
            | "albumId"
        >[];
        return songs;
    } else if (list.type == "album") {
        const response = await fetch(
            `/api/songs1?songs=${list.songs.join()}&p=id,image,name,artists,path,duration,albumName,albumId`
        );
        const songs = (await response.json()) as SongDB<
            | "id"
            | "image"
            | "name"
            | "artists"
            | "path"
            | "duration"
            | "albumName"
            | "albumId"
        >[];
        return songs;
    } else {
        console.warn("Unknown list type:", list);
    }
}
