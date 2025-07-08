"use client";

import { getImageUrl } from "@/lib/getImageUrl";
import Link from "next/link";
import Image from "@/components/Image";
import { PlaylistDB } from "@/lib/db/playlist";
import { AlbumDB } from "@/lib/db/album";
import NewPlaylistButton from "@/components/Library/NewPlaylistButton";
import useWindowSize from "@/hooks/useWindowSize";
import { AddListContextMenu } from "./AddListContextMenu";

export function GridLayout({
    filteredAlbums,
    filteredPlaylists,
}: {
    filteredPlaylists: PlaylistDB[];
    filteredAlbums: AlbumDB[];
}) {
    const { width } = useWindowSize();
    if (!width) return null;

    return (
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
                <AddListContextMenu key={"playlist" + index} list={playlist}>
                    <Link
                        href={`/playlist/${playlist.id}`}
                        className="library-item flex h-auto w-full max-w-full min-w-0 flex-col transition-transform md:hover:scale-110"
                    >
                        <Image
                            alt={playlist.name}
                            className="cover aspect-square h-auto w-full rounded-md"
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
                </AddListContextMenu>
            ))}

            {filteredAlbums.map((album, index) => (
                <AddListContextMenu key={"album" + index} list={album}>
                    <Link
                        key={"album" + index}
                        href={`/album/${album.id}`}
                        className="library-item flex h-auto w-full max-w-full min-w-0 flex-col transition-transform md:hover:scale-110"
                    >
                        <Image
                            alt={album.name}
                            className="cover aspect-square h-auto w-full rounded-md"
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
                </AddListContextMenu>
            ))}
        </div>
    );
}
