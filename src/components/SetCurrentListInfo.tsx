import type { SongDB } from "@/lib/db";
import { currentList, currentListSongs } from "@/stores/currentList";

export default function SetCurrentListInfo({
    songs,
    id,
    type,
}: {
    songs: SongDB<
        | "id"
        | "name"
        | "artists"
        | "image"
        | "duration"
        | "albumId"
        | "albumName"
    >[];
    id: string;
    type: string;
}) {
    console.warn("currentListSongs.set", songs);
    currentListSongs.set(songs);
    currentList.set({ id, type: type });

    return <></>;
}
