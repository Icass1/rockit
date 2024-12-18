import type { SongDB } from "@/lib/db";
import { atom } from "nanostores";

export const currentListSongs = atom<
    SongDB<
        | "id"
        | "name"
        | "artists"
        | "images"
        | "duration"
        | "albumId"
        | "albumName"
    >[]
>([]);

export const currentList = atom<{ type: string; id: string } | undefined>(
    undefined
);
