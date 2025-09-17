"use client";

import { getImageUrl } from "@/lib/getImageUrl";
import Link from "next/link";
import Image from "@/components/Image";
import { PlaylistDB } from "@/lib/db/playlist";
import { AlbumDB } from "@/lib/db/album";
import NewPlaylistButton from "@/components/Library/NewPlaylistButton";
import useWindowSize from "@/hooks/useWindowSize";
import { useMemo } from "react";
import { AddListContextMenu } from "./AddListContextMenu";

export function ByArtistLayout({
    filteredAlbums,
    filteredPlaylists,
}: {
    filteredAlbums: AlbumDB[];
    filteredPlaylists: PlaylistDB[];
}) {
    const { width } = useWindowSize();

    const artists = useMemo(() => {
        const artistMap: Record<string, (AlbumDB | PlaylistDB)[]> = {};

        artistMap["Your playlists"] = [];

        filteredAlbums.forEach((album) => {
            album.artists.forEach((artist) => {
                if (!artistMap[artist.name]) {
                    artistMap[artist.name] = [];
                }
                artistMap[artist.name].push(album);
            });
        });
        filteredPlaylists.forEach((playlist) => {
            artistMap["Your playlists"].push(playlist);
        });
        return Object.entries(artistMap).map(([name, lists]) => ({
            name,
            lists,
        }));
    }, [filteredAlbums, filteredPlaylists]);

    if (!width) return null;

    return (
        <div className="flex flex-col gap-7">
            {artists.map((artist) => (
                <div key={artist.name} className="flex flex-col gap-4">
                    <h3 className="ml-6 text-2xl font-semibold">
                        {artist.name}
                    </h3>

                    <div
                        className="grid gap-x-5 gap-y-3 px-5"
                        style={{
                            gridTemplateColumns:
                                width < 768
                                    ? "repeat(auto-fill, minmax(40%, 1fr))"
                                    : "repeat(auto-fill, minmax(200px, 1fr))",
                        }}
                    >
                        {artist.name === "Your playlists" ? (
                            <NewPlaylistButton />
                        ) : null}
                        {artist.lists.map((list, index) => {
                            return (
                                <AddListContextMenu
                                    key={"list" + index}
                                    list={list}
                                >
                                    <Link
                                        key={"list" + index}
                                        href={
                                            artist.name === "Your playlists"
                                                ? `/playlist/${list.id}`
                                                : `/album/${list.id}`
                                        }
                                        className="library-item flex h-auto w-full max-w-full min-w-0 flex-col transition-transform md:hover:scale-110"
                                    >
                                        <Image
                                            alt={list.name}
                                            className="cover aspect-square h-auto w-full rounded-md"
                                            src={getImageUrl({
                                                imageId: list.image,
                                                height: 300,
                                                width: 300,
                                                fallback:
                                                    list?.images?.[0]?.url,
                                                placeHolder:
                                                    "/api/image/song-placeholder.png",
                                            })}
                                        />
                                        <label className="mt-1 truncate text-center font-semibold">
                                            {list.name}
                                        </label>
                                    </Link>
                                </AddListContextMenu>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
