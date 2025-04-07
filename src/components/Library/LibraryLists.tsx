"use client";

import { getImageUrl } from "@/lib/getImageUrl";
import Link from "next/link";
import Image from "../Image";
import { useEffect, useState } from "react";
import { PlaylistDB } from "@/lib/db/playlist";
import { AlbumDB } from "@/lib/db/album";
import { useStore } from "@nanostores/react";
import { langData } from "@/stores/lang";
import NewPlaylistButton from "@/components/Library/NewPlaylistButton";
import useWindowSize from "@/hooks/useWindowSize";

export function LibraryLists() {
    const [playlists, setPlaylists] = useState<PlaylistDB[]>([]);
    const [albums, setAlbums] = useState<AlbumDB[]>([]);

    const { width } = useWindowSize();

    useEffect(() => {
        fetch("/api/library/lists").then((response) => {
            if (response.ok) {
                response.json().then((data) => {
                    setPlaylists(data.playlists);
                    setAlbums(data.albums);
                });
            }
        });
    }, []);

    const $lang = useStore(langData);

    if (!$lang) return;

    return (
        <section>
            <h2 className="text-2xl font-bold text-left py-4 px-5 md:px-0">
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
                {playlists.map((playlist, index) => {
                    if (!playlist)
                        return (
                            <label key={"playlist" + index}>
                                Playlist is undefined
                            </label>
                        );
                    return (
                        <Link
                            key={"playlist" + index}
                            href={`/playlist/${playlist.id}`}
                            className="w-full h-auto flex flex-col min-w-0 max-w-full md:hover:scale-110 transition-transform library-item"
                        >
                            <Image
                                alt={playlist.name}
                                className="rounded-md w-full h-full cover"
                                src={getImageUrl({
                                    imageId: playlist.image,
                                    height: 300,
                                    width: 300,
                                    fallback: playlist.images?.[0]?.url,
                                    placeHolder: "/rockit-background.png",
                                })}
                            />
                            <label className="truncate font-semibold text-center min-h-6">
                                {playlist.name}
                            </label>
                            <label className="truncate text-sm text-center text-gray-400 min-h-5">
                                {playlist.owner}
                            </label>
                        </Link>
                    );
                })}

                {albums.map((album, index) => {
                    if (!album)
                        return (
                            <label key={"album" + index}>
                                Album is undefined
                            </label>
                        );
                    return (
                        <Link
                            key={"album" + index}
                            href={`/album/${album.id}`}
                            className="w-fit h-fit flex flex-col min-w-0 max-w-full md:hover:scale-105 transition-transform library-item"
                        >
                            <Image
                                alt={album.name}
                                className="rounded-md"
                                src={getImageUrl({
                                    imageId: album.image,
                                    height: 300,
                                    width: 300,
                                    fallback: album.images[0]?.url,
                                    placeHolder: "/song-placeholder.png",
                                })}
                            />
                            <label className="truncate font-semibold text-center mt-1">
                                {album.name}
                            </label>
                            <div className="text-sm text-center flex flex-row text-gray-400 mx-auto truncate max-w-full">
                                {album.artists.map((artist, index) => (
                                    <label
                                        key={album.id + artist.id}
                                        className="md:hover:underline truncate"
                                        onClick={() =>
                                            console.log(
                                                `event.preventDefault(); event.stopPropagation(); location.href='/artist/${artist.id}' `
                                            )
                                        }
                                    >
                                        {`${artist.name}${
                                            index < album.artists.length - 1
                                                ? ", "
                                                : ""
                                        }`}
                                    </label>
                                ))}
                            </div>
                        </Link>
                    );
                })}
            </div>
            <div className="min-h-10"></div>
        </section>
    );
}
