"use client";

import Image from "next/image";
import { RockItSongWithAlbum } from "@/lib/rockit/rockItSongWithAlbum";
import { songHandleClick } from "@/components/ListSongs/HandleClick";
import SongContextMenu from "@/components/ListSongs/SongContextMenu";

export default function QuickSelectionsSong({
    song,
    songs,
}: {
    song: RockItSongWithAlbum;
    songs: RockItSongWithAlbum[];
}) {
    const handleClick = () => {
        songHandleClick(
            song.toRockItSongWithoutAlbum(),
            songs.map((s) => s.toRockItSongWithoutAlbum())
        );
    };

    return (
        <SongContextMenu onPlay={handleClick} song={song}>
            <div
                className="flex h-fit cursor-pointer items-center gap-2 rounded-lg p-2 transition hover:bg-zinc-800"
                onClick={handleClick}
            >
                {/* Imagen de la canción */}
                <Image
                    width={100}
                    height={100}
                    className="aspect-square h-12 min-h-12 w-12 min-w-12 rounded-sm object-cover"
                    src={song.internalImageUrl ?? "/song-placeholder.png"}
                    alt={`Cover of ${song.name}`}
                />
                <div className="flex w-full min-w-0 flex-col justify-center">
                    <span className="w-full min-w-0 truncate text-sm font-semibold text-white">
                        {song.name}
                    </span>
                    <span className="w-full min-w-0 truncate text-xs text-gray-400">
                        {song.artists[0].name} {" • "} {song.album.name}
                    </span>
                </div>
            </div>
        </SongContextMenu>
    );
}
