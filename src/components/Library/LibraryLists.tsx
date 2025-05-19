"use client";

import { getImageUrl } from "@/lib/getImageUrl";
import Link from "next/link";
import Image from "@/components/Image";
import { useMemo } from "react";
import { PlaylistDB } from "@/lib/db/playlist";
import { AlbumDB } from "@/lib/db/album";
import { useStore } from "@nanostores/react";
import { langData } from "@/stores/lang";
import NewPlaylistButton from "@/components/Library/NewPlaylistButton";
import useWindowSize from "@/hooks/useWindowSize";
import useFetch from "@/hooks/useFetch";

export function LibraryLists({
    filterMode,
    searchQuery,
}: {
    filterMode: "default" | "asc" | "desc";
    searchQuery: string;
}) {
    const { width } = useWindowSize();
    const $lang = useStore(langData);

    const data = useFetch<{
        playlists: PlaylistDB[];
        albums: AlbumDB[];
    }>("/api/library/lists");

    const playlists = data?.playlists;
    const albums = data?.albums;

    const filteredPlaylists = useMemo(() => {
        if (!playlists) return;

        let result = playlists.filter((pl) =>
            pl.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filterMode === "asc") {
            result = result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (filterMode === "desc") {
            result = result.sort((a, b) => b.name.localeCompare(a.name));
        }

        return result;
    }, [playlists, filterMode, searchQuery]);

    const filteredAlbums = useMemo(() => {
        if (!albums) return;

        let result = albums.filter((al) => {
            const matchesName = al.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const matchesArtist = al.artists.some((artist) =>
                artist.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return matchesName || matchesArtist;
        });

        if (filterMode === "asc") {
            result = result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (filterMode === "desc") {
            result = result.sort((a, b) => b.name.localeCompare(a.name));
        }

        return result;
    }, [albums, filterMode, searchQuery]);

    if (!width || !$lang || !filteredPlaylists || !filteredAlbums) return null;

    return (
        <section>
            <h2 className="px-5 py-4 text-left text-2xl font-bold md:px-0">
                {$lang.your_albums_playlists}
            </h2>
            <div
                className="grid gap-x-5 gap-y-3 px-5"
                style={{
                    gridTemplateColumns:
                        width < 768
                            ? "repeat(auto-fill, minmax(40%, 1fr))"
                            : "repeat(auto-fill, minmax(200px, 1fr))",
                }}
            >
                <NewPlaylistButton />

                {filteredPlaylists.map((playlist, index) => (
                    <Link
                        key={"playlist" + index}
                        href={`/playlist/${playlist.id}`}
                        className="library-item flex h-auto w-full max-w-full min-w-0 flex-col transition-transform md:hover:scale-110"
                    >
                        <Image
                            alt={playlist.name}
                            className="cover h-full w-full rounded-md"
                            src={getImageUrl({
                                imageId: playlist.image,
                                height: 300,
                                width: 300,
                                fallback: playlist.images?.[0]?.url,
                                placeHolder: "/api/image/rockit-background.png",
                            })}
                        />
                        <label className="min-h-6 truncate text-center font-semibold">
                            {playlist.name}
                        </label>
                        <label className="min-h-5 truncate text-center text-sm text-gray-400">
                            {playlist.owner}
                        </label>
                    </Link>
                ))}

                {filteredAlbums.map((album, index) => (
                    <Link
                        key={"album" + index}
                        href={`/album/${album.id}`}
                        className="library-item flex h-fit w-fit max-w-full min-w-0 flex-col transition-transform md:hover:scale-105"
                    >
                        <Image
                            alt={album.name}
                            className="rounded-md"
                            src={getImageUrl({
                                imageId: album.image,
                                height: 300,
                                width: 300,
                                fallback: album.images[0]?.url,
                                placeHolder: "/api/image/song-placeholder.png",
                            })}
                        />
                        <label className="mt-1 truncate text-center font-semibold">
                            {album.name}
                        </label>
                        <div className="mx-auto flex max-w-full flex-row truncate text-center text-sm text-gray-400">
                            {album.artists.map((artist, i) => (
                                <label
                                    key={album.id + artist.id}
                                    className="truncate md:hover:underline"
                                >
                                    {artist.name}
                                    {i < album.artists.length - 1 ? ", " : ""}
                                </label>
                            ))}
                        </div>
                    </Link>
                ))}
            </div>
            <div className="min-h-10" />
        </section>
    );
}
