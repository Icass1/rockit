import { useMemo, useState } from "react";
import { BaseSongForPlaylistResponse } from "@/dto";

export type SortColumn = "name" | "album" | "artist" | "addedAt" | "duration";

interface SortState {
    column: SortColumn;
    ascending: boolean;
}

export function usePlaylistSort(songs: BaseSongForPlaylistResponse[]) {
    const [filter, setFilter] = useState<SortState>({
        column: "addedAt",
        ascending: false,
    });

    const toggleSort = (column: SortColumn) => {
        setFilter((prev) =>
            prev.column === column
                ? { column, ascending: !prev.ascending }
                : { column, ascending: false }
        );
    };

    const sortedSongs = useMemo(() => {
        const dir = filter.ascending ? 1 : -1;

        return [...songs].sort((a, b) => {
            switch (filter.column) {
                case "name": {
                    const na = a.song.name.toLowerCase();
                    const nb = b.song.name.toLowerCase();
                    return na < nb ? dir : na > nb ? -dir : 0;
                }
                case "addedAt": {
                    if (!a.addedAt || !b.addedAt) return 0;
                    return (
                        (new Date(a.addedAt).getTime() -
                            new Date(b.addedAt).getTime()) *
                        dir
                    );
                }
                case "album": {
                    const aa = a.song.album.name.toLowerCase();
                    const ab = b.song.album.name.toLowerCase();
                    return aa < ab ? dir : aa > ab ? -dir : 0;
                }
                case "artist": {
                    const art_a = a.song.artists
                        .map((x) => x.name)
                        .join("")
                        .toLowerCase();
                    const art_b = b.song.artists
                        .map((x) => x.name)
                        .join("")
                        .toLowerCase();
                    return art_a < art_b ? dir : art_a > art_b ? -dir : 0;
                }
                case "duration":
                    return (a.song.duration - b.song.duration) * dir;
                default:
                    return 0;
            }
        });
    }, [filter, songs]);

    return { sortedSongs, filter, toggleSort };
}
