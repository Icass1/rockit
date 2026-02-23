"use client";

import PlaylistSong from "@/components/ListSongs/PlaylistSong";
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import PlaylistHeader from "./PlaylistHeader";
import useWindowSize from "@/hooks/useWindowSize";
import { rockIt } from "@/lib/rockit/rockIt";
import { RockItPlaylist } from "@/lib/rockit/rockItPlaylist";
import { RockItSongPlaylist } from "@/lib/rockit/rockItSongPlaylist";
import { useLanguage } from "@/contexts/LanguageContext";
import { RockItPlaylistResponse } from "@/dto/rockItPlaylistResponse";

type ColumnsType = "name" | "album" | "artist" | "addedAt" | "duration";

export default function PlaylistSongsView({
    playlistResponse,
}: {
    playlistResponse: RockItPlaylistResponse;
}) {
    const playlist = RockItPlaylist.fromResponse(playlistResponse);

    useEffect(() => {
        // console.log("useEffect 3");
        rockIt.queueManager.setCurrentList({
            publicId: playlist.publicId,
            type: "playlist",
        });
    }, [playlist.publicId]);

    const [filter, setFilter] = useState<{
        column: ColumnsType;
        ascending: boolean;
    }>({ column: "addedAt", ascending: false });

    const [songsToRender, setSongsToRender] = useState<RockItSongPlaylist[]>(
        []
    );

    const divRef = useRef<HTMLDivElement>(null);
    const [scroll, setScroll] = useState(0);
    const innerWidth = useWindowSize().width;

    const toggleFilter = (column: ColumnsType) => {
        setFilter((value) => {
            if (value.column == column) {
                return { column: column, ascending: !value.ascending };
            } else {
                return { column: column, ascending: false };
            }
        });
    };

    useEffect(() => {
        // console.log("useEffect 2");
        // console.warn("songsToRender", songsToRender);
        rockIt.currentListManager.setCurrentListSongs(songsToRender);
    }, [songsToRender]);

    useEffect(() => {
        // console.log("useEffect 1", filter, playlist.songs);
        switch (filter.column) {
            case "name":
                setSongsToRender(
                    playlist.songs.toSorted((a, b) => {
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
                    playlist.songs.toSorted((a, b) => {
                        if (!a.addedAt || !b.addedAt) {
                            return 0;
                        }
                        return (
                            (new Date(a?.addedAt).getTime() -
                                new Date(b?.addedAt).getTime()) *
                            (filter.ascending ? 1 : -1)
                        );
                    })
                );
                return;
            case "album":
                setSongsToRender(
                    playlist.songs.toSorted((a, b) => {
                        const albumNameA = a.album.name.toLowerCase();
                        const albumNameB = b.album.name.toLowerCase();
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
                    playlist.songs.toSorted((a, b) => {
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
                    playlist.songs.toSorted((a, b) => {
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
    }, [filter, playlist.songs]);

    const renderColumn = (column: ColumnsType) => {
        if (!lang) return false;
        const columnNames = {
            name: lang.name,
            album: lang.album,
            artist: lang.artist,
            addedAt: lang.date_added,
            duration: lang.duration,
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

    const { langFile: lang } = useLanguage();
    if (!lang) return false;

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
            <PlaylistHeader
                playlistResponse={playlistResponse}
                className="flex md:hidden"
            />
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
                            key={song.publicId + index}
                            className="absolute right-0 left-0 h-[56px]"
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
                    minHeight: `${
                        songsToRender.length * (4 + 56) +
                        marginTop +
                        innerWidth -
                        200
                    }px`,
                }}
            />
        </div>
    );
}
