import { SongPlaylist } from "@/lib/rockit/songPlaylist";
import { useState, useMemo } from "react";

export type SortColumn = "name" | "album" | "artist" | "addedAt" | "duration";

interface SortState {
    column: SortColumn;
    ascending: boolean;
}

export function usePlaylistSort(songs: SongPlaylist[]) {
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
                    const na = a.name.toLowerCase();
                    const nb = b.name.toLowerCase();
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
                    const aa = a.album.name.toLowerCase();
                    const ab = b.album.name.toLowerCase();
                    return aa < ab ? dir : aa > ab ? -dir : 0;
                }
                case "artist": {
                    const art_a = a.artists
                        .map((x) => x.name)
                        .join("")
                        .toLowerCase();
                    const art_b = b.artists
                        .map((x) => x.name)
                        .join("")
                        .toLowerCase();
                    return art_a < art_b ? dir : art_a > art_b ? -dir : 0;
                }
                case "duration":
                    return (a.duration - b.duration) * dir;
                default:
                    return 0;
            }
        });
    }, [filter, songs]);

    return { sortedSongs, filter, toggleSort };
}
