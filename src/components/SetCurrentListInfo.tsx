import type { SongDB } from "@/db/song";
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
        | "path"
    >[];
    id: string;
    type: string;
}) {
    console.warn("currentListSongs.set", songs);
    currentListSongs.set(songs);
    currentList.set({ id, type: type });

    return <></>;
}
