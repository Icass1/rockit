import type { PlaylistDBSongWithAddedAt } from "@/lib/db";
import PlaylistSong from "./PlaylistSong";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { currentList, currentListSongs } from "@/stores/currentList";

type columnsType = "name" | "album" | "artist" | "addedAt";

export default function PlaylistSongsView({
    songs,
    id,
}: {
    id: string;
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
}) {
    currentList.set({ id, type: "playlist" });

    const [filter, setFilter] = useState<{
        column: columnsType;
        ascending: boolean;
    }>({ column: "name", ascending: true });

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

    const toggleFilter = (column: columnsType) => {
        setFilter((value) => {
            if (value.column == column) {
                return { column: column, ascending: !value.ascending };
            } else {
                return { column: column, ascending: true };
            }
        });
    };

    useEffect(() => {
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
        }
    }, [filter]);

    const renderColumn = (column: columnsType) => {
        const columnNames = {
            name: "Name",
            album: "Album",
            artist: "Artist",
            addedAt: "Recently added",
        };

        return (
            <label
                className={
                    "hover:underline cursor-pointer flex flex-row items-center " +
                    (filter.column == column ? "text-green-600" : "")
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

    return (
        <>
            <div className="flex flex-row items-center gap-4 px-2 rounded text-stone-400 text-sm">
                <div className="w-10"></div>
                <div className="flex flex-row w-full items-center justify-between">
                    <div className="w-1/3 ">{renderColumn("name")}</div>
                    <div className="flex-1 gap-x-1 flex flex-row">
                        {renderColumn("artist")}
                        <label>•</label>
                        {renderColumn("album")}
                        <label>•</label>
                        {renderColumn("addedAt")}
                    </div>
                </div>
            </div>

            {songsToRender.map((song) => {
                if (song) {
                    return <PlaylistSong song={song} />;
                } else {
                    return <div>Song is undefined</div>;
                }
            })}
        </>
    );
}
