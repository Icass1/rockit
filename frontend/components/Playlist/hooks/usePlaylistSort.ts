import { useMemo, useState } from "react";

export type SortColumn = "name" | "album" | "artist" | "addedAt" | "duration";

interface SortState {
    column: SortColumn;
    ascending: boolean;
}

type PlaylistMediaItem = {
    item: {
        type: string;
        provider: string;
        publicId: string;
        url: string;
        name: string;
        artists: {
            provider: string;
            publicId: string;
            url: string;
            name: string;
            imageUrl: string;
        }[];
        audioSrc: string | null;
        videoSrc: string | null;
        imageUrl: string;
        duration?: number;
        duration_ms?: number;
        album?: {
            provider: string;
            publicId: string;
            url: string;
            name: string;
            imageUrl: string;
        };
        downloaded?: boolean;
    };
    addedAt?: string;
};

export function usePlaylistSort(songs: PlaylistMediaItem[]) {
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
                    const na = a.item.name.toLowerCase();
                    const nb = b.item.name.toLowerCase();
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
                    const aa = a.item.album?.name.toLowerCase() ?? "";
                    const ab = b.item.album?.name.toLowerCase() ?? "";
                    return aa < ab ? dir : aa > ab ? -dir : 0;
                }
                case "artist": {
                    const art_a = a.item.artists
                        .map((x: { name: string }) => x.name)
                        .join("")
                        .toLowerCase();
                    const art_b = b.item.artists
                        .map((x: { name: string }) => x.name)
                        .join("")
                        .toLowerCase();
                    return art_a < art_b ? dir : art_a > art_b ? -dir : 0;
                }
                case "duration":
                    return (
                        ((a.item.duration ?? 0) - (b.item.duration ?? 0)) * dir
                    );
                default:
                    return 0;
            }
        });
    }, [filter, songs]);

    return { sortedSongs, filter, toggleSort };
}
