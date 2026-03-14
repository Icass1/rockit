"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BasePlaylistResponse, BaseSongWithAlbumResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { ArrowUp } from "lucide-react";
import useWindowSize from "@/hooks/useWindowSize";
import { rockIt } from "@/lib/rockit/rockIt";
import PlaylistSong from "@/components/ListSongs/PlaylistSong";
import PlaylistHeader from "@/components/Playlist/PlaylistHeader";

type MediaItem = {
    item: {
        publicId: string;
        name: string;
        duration?: number;
        artists?: { name: string }[];
        album?: { name: string };
    };
    addedAt?: string;
};

type ColumnsType = "name" | "album" | "artist" | "addedAt" | "duration";

export default function PlaylistSongsView({
    playlist,
}: {
    playlist: BasePlaylistResponse;
}) {
    useEffect(() => {
        rockIt.queueManager.setCurrentList(playlist.publicId);
    }, [playlist.publicId]);

    const [filter, setFilter] = useState<{
        column: ColumnsType;
        ascending: boolean;
    }>({ column: "addedAt", ascending: false });

    const [songsToRender, setSongsToRender] = useState<MediaItem[]>([]);

    const sortedSongs = useMemo(() => {
        const medias = playlist.medias as MediaItem[];
        switch (filter.column) {
            case "name":
                return medias.toSorted((a, b) => {
                    const nameA = a.item.name.toLowerCase();
                    const nameB = b.item.name.toLowerCase();
                    if (nameA < nameB) {
                        return filter.ascending ? 1 : -1;
                    }
                    if (nameA > nameB) {
                        return filter.ascending ? -1 : 1;
                    }
                    return 0;
                });
            case "addedAt":
                return medias.toSorted((a, b) => {
                    if (!a.addedAt || !b.addedAt) {
                        return 0;
                    }
                    return (
                        (new Date(a?.addedAt).getTime() -
                            new Date(b?.addedAt).getTime()) *
                        (filter.ascending ? 1 : -1)
                    );
                });
            case "album":
                return medias.toSorted((a, b) => {
                    const albumNameA = a.item.album?.name.toLowerCase() ?? "";
                    const albumNameB = b.item.album?.name.toLowerCase() ?? "";
                    if (albumNameA < albumNameB) {
                        return filter.ascending ? 1 : -1;
                    }
                    if (albumNameA > albumNameB) {
                        return filter.ascending ? -1 : 1;
                    }
                    return 0;
                });
            case "artist":
                return medias.toSorted((a, b) => {
                    const artistsA =
                        a.item.artists
                            ?.map((artist) => artist.name)
                            .join("")
                            .toLowerCase() ?? "";
                    const artistsB =
                        b.item.artists
                            ?.map((artist) => artist.name)
                            .join("")
                            .toLowerCase() ?? "";
                    if (artistsA < artistsB) {
                        return filter.ascending ? 1 : -1;
                    }
                    if (artistsA > artistsB) {
                        return filter.ascending ? -1 : 1;
                    }
                    return 0;
                });
            case "duration":
                return medias.toSorted((a, b) => {
                    if ((a.item.duration ?? 0) < (b.item.duration ?? 0)) {
                        return filter.ascending ? 1 : -1;
                    }
                    if ((a.item.duration ?? 0) > (b.item.duration ?? 0)) {
                        return filter.ascending ? -1 : 1;
                    }
                    return 0;
                });
            default:
                return medias;
        }
    }, [filter, playlist.medias]);

    useEffect(() => {
        setSongsToRender(sortedSongs);
    }, [sortedSongs]);

    useEffect(() => {
        rockIt.currentListManager.setCurrentListSongs(
            songsToRender.map(
                (m) => m.item
            ) as unknown as BaseSongWithAlbumResponse[]
        );
    }, [songsToRender]);

    const divRef = useRef<HTMLDivElement>(null);
    const [scroll, setScroll] = useState(0);
    const [boundaries, setBoundaries] = useState<DOMRect | null>(null);
    const innerWidth = useWindowSize().width;

    useLayoutEffect(() => {
        if (divRef.current) {
            setBoundaries(divRef.current.getBoundingClientRect());
        }
    }, [innerWidth, songsToRender]);

    const toggleFilter = (column: ColumnsType) => {
        setFilter((value) => {
            if (value.column == column) {
                return { column: column, ascending: !value.ascending };
            } else {
                return { column: column, ascending: false };
            }
        });
    };

    const renderColumn = (column: ColumnsType) => {
        const columnNames = {
            name: $vocabulary.NAME,
            album: $vocabulary.ALBUM,
            artist: $vocabulary.ARTIST,
            addedAt: $vocabulary.DATE_ADDED,
            duration: $vocabulary.DURATION,
        };

        return (
            <label
                className={
                    "flex cursor-pointer flex-row items-center font-semibold select-none hover:underline " +
                    (filter.column == column ? "text-[#ec5588]" : "")
                }
                onClick={() => {
                    toggleFilter(column);
                }}
            >
                {columnNames[column]}
                {renderArrow(column)}
            </label>
        );
    };

    const renderArrow = (column: ColumnsType) => {
        if (filter.column == column) {
            return (
                <ArrowUp
                    className={
                        "h-5 w-5 transition-transform " +
                        (filter.ascending ? "" : "rotate-180")
                    }
                ></ArrowUp>
            );
        }
    };

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    if (!innerWidth) return;

    const marginTop = innerWidth < 768 ? 20 : 96;

    return (
        <div
            ref={divRef}
            onScroll={(event) => {
                setScroll(event.currentTarget.scrollTop);
            }}
            className="relative h-full max-h-full min-h-0 overflow-auto md:w-full md:pr-6"
        >
            <PlaylistHeader playlist={playlist} className="flex md:hidden" />
            <div
                className="hidden flex-row items-center gap-4 rounded px-2 text-sm text-stone-400 md:flex"
                style={{ marginTop: `${marginTop}px` }}
            >
                <div className="w-10"></div>
                <div className="flex w-full flex-row items-center justify-between">
                    <div className="w-1/3">{renderColumn("name")}</div>
                    <div className="flex w-1/2 flex-1 flex-row gap-x-1">
                        {renderColumn("artist")}
                        <label>•</label>
                        {renderColumn("album")}
                        <label>•</label>
                        {renderColumn("addedAt")}
                    </div>
                    <div className="">{renderColumn("duration")}</div>
                </div>
            </div>
            {/* 4px between songs */}
            {/* 56px height of songs */}
            {songsToRender.length == 0 && (
                <label className="absolute block w-full text-center text-xl font-bold text-neutral-400 md:top-1/2 md:-translate-y-1/2 md:text-3xl">
                    There is nothing to show here
                </label>
            )}
            {songsToRender.map((song, index) => {
                if (song) {
                    let top =
                        index * (56 + 4) +
                        (innerWidth < 768 ? 100 : 25) +
                        marginTop;
                    if (innerWidth < 768) top += innerWidth;

                    if (boundaries) {
                        if (
                            top > boundaries.height + scroll ||
                            top < scroll - (56 + 4)
                        )
                            return;
                    }

                    return (
                        <div
                            key={song.item.publicId + index}
                            className="absolute right-0 left-0 h-14"
                            style={{ top: `${top}px` }}
                        >
                            <PlaylistSong song={song as never} />
                        </div>
                    );
                } else {
                    return (
                        <div key={index} className="text-red-400">
                            Song is undefined
                        </div>
                    );
                }
            })}
            {/* 84px at the bottom*/}
            <div
                style={{
                    minHeight: `${songsToRender.length * (4 + 56) + marginTop + innerWidth - 200}px`,
                }}
            />
        </div>
    );
}
