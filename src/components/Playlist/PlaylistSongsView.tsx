import type {
    PlaylistDB,
    PlaylistDBSong,
    PlaylistDBSongWithAddedAt,
} from "@/db/playlist";
import PlaylistSong from "../ListSongs/PlaylistSong";
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { currentList, currentListSongs } from "@/stores/currentList";
import PlaylistHeader from "./PlaylistHeader";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import useWindowSize from "@/hooks/useWindowSize";

type columnsType = "name" | "album" | "artist" | "addedAt" | "duration";

export default function PlaylistSongsView({
    songs,
    id,
    playlist,
    inDatabase,
}: {
    id: string;
    inDatabase: boolean;
    songs: PlaylistDBSongWithAddedAt<
        | "id"
        | "images"
        | "image"
        | "name"
        | "albumId"
        | "duration"
        | "artists"
        | "path"
        | "albumName"
    >[];
    playlist:
        | PlaylistDB
        | {
              name: string;
              songs: PlaylistDBSong[];
              image: string;
              images: {
                  url: string;
              }[];
              owner: string;
          };
}) {
    useEffect(() => {
        currentList.set({ id, type: "playlist" });
    }, []);

    const [filter, setFilter] = useState<{
        column: columnsType;
        ascending: boolean;
    }>({ column: "addedAt", ascending: false });

    const [songsToRender, setSongsToRender] = useState<
        PlaylistDBSongWithAddedAt<
            | "id"
            | "images"
            | "image"
            | "name"
            | "albumId"
            | "duration"
            | "artists"
            | "path"
            | "albumName"
        >[]
    >([]);

    const divRef = useRef<HTMLDivElement>(null);
    const [scroll, setScroll] = useState(0);
    const innerWidth = useWindowSize().width;

    const toggleFilter = (column: columnsType) => {
        setFilter((value) => {
            if (value.column == column) {
                return { column: column, ascending: !value.ascending };
            } else {
                return { column: column, ascending: false };
            }
        });
    };

    useEffect(() => {
        // console.warn("songsToRender", songsToRender);
        currentListSongs.set(songsToRender);
    }, [songsToRender]);

    useEffect(() => {
        switch (filter.column) {
            case "name":
                setSongsToRender(
                    songs.toSorted((a, b) => {
                        const nameA = a.name.toLowerCase();
                        const nameB = b.name.toLowerCase();
                        if (nameA < nameB) {
                            return filter.ascending ? 1 : -1;
                        }
                        if (nameA > nameB) {
                            return filter.ascending ? -1 : 1;
                        }
                        return 0;
                    })
                );
                return;
            case "addedAt":
                setSongsToRender(
                    songs.toSorted(
                        (a, b) =>
                            (new Date(a.added_at).getTime() -
                                new Date(b.added_at).getTime()) *
                            (filter.ascending ? 1 : -1)
                    )
                );
                return;
            case "album":
                setSongsToRender(
                    songs.toSorted((a, b) => {
                        const albumNameA = a.albumName.toLowerCase();
                        const albumNameB = b.albumName.toLowerCase();
                        if (albumNameA < albumNameB) {
                            return filter.ascending ? 1 : -1;
                        }
                        if (albumNameA > albumNameB) {
                            return filter.ascending ? -1 : 1;
                        }
                        return 0;
                    })
                );
                return;
            case "artist":
                setSongsToRender(
                    songs.toSorted((a, b) => {
                        const artistsA = a.artists
                            .map((artist) => artist.name)
                            .join("")
                            .toLowerCase();
                        const artistsB = b.artists
                            .map((artist) => artist.name)
                            .join("")
                            .toLowerCase();
                        if (artistsA < artistsB) {
                            return filter.ascending ? 1 : -1;
                        }
                        if (artistsA > artistsB) {
                            return filter.ascending ? -1 : 1;
                        }
                        return 0;
                    })
                );
                return;
            case "duration":
                setSongsToRender(
                    songs.toSorted((a, b) => {
                        if (a.duration < b.duration) {
                            return filter.ascending ? 1 : -1;
                        }
                        if (a.duration > b.duration) {
                            return filter.ascending ? -1 : 1;
                        }
                        return 0;
                    })
                );

                return;
        }
    }, [filter]);

    const renderColumn = (column: columnsType) => {
        if (!$lang) return;
        const columnNames = {
            name: $lang.name,
            album: $lang.album,
            artist: $lang.artist,
            addedAt: $lang.date_added,
            duration: $lang.duration,
        };

        return (
            <label
                className={
                    "hover:underline cursor-pointer flex flex-row items-center font-semibold select-none " +
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

    const renderArrow = (column: columnsType) => {
        if (filter.column == column) {
            return (
                <ArrowUp
                    className={
                        "w-5 h-5 transition-transform " +
                        (filter.ascending ? "" : "rotate-180")
                    }
                ></ArrowUp>
            );
        }
    };
    const $lang = useStore(langData);
    if (!$lang) return;
    return (
        <div
            ref={divRef}
            onScroll={(event) => {
                setScroll(event.currentTarget.scrollTop);
            }}
            className="min-w-0 max-w-full w-full min-h-0 max-h-full h-full overflow-auto relative md:pr-6"
        >
            <div className="md:hidden min-h-20"></div>

            <PlaylistHeader
                id={id}
                playlist={playlist}
                songs={songs}
                inDatabase={inDatabase}
                className="md:hidden flex"
            />
            <div className="hidden md:flex flex-row items-center gap-4 px-2 rounded text-stone-400 text-sm">
                <div className="w-10"></div>
                <div className="flex flex-row w-full items-center justify-between">
                    <div className="w-1/3 ">{renderColumn("name")}</div>
                    <div className="flex-1 gap-x-1 flex flex-row w-1/2">
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
            {songsToRender.map((song, index) => {
                if (song) {
                    let top = index * (56 + 4) + (innerWidth < 768 ? 100 : 25);
                    if (innerWidth < 768) top += 400;

                    if (divRef.current) {
                        const boundaries =
                            divRef.current.getBoundingClientRect();

                        if (
                            top > boundaries.height + scroll ||
                            top < scroll - (56 + 4)
                        )
                            return;
                    }

                    return (
                        <div
                            key={song.id + index}
                            className="absolute h-[56px] left-0 right-0"
                            style={{ top: `${top}px` }}
                        >
                            <PlaylistSong song={song} />
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
                    minHeight: `${songsToRender.length * (4 + 56) + 100}px`,
                }}
            />
        </div>
    );
}
