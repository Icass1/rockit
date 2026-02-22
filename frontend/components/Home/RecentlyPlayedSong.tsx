"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { RockItSongWithoutAlbum } from "@/lib/rockit/rockItSongWithoutAlbum";
import { songHandleClick } from "@/components/ListSongs/HandleClick";

export default function RecentlyPlayedSong({
    song,
    songs,
}: {
    song: RockItSongWithoutAlbum;
    songs: RockItSongWithoutAlbum[];
}) {
    const router = useRouter();

    return (
        <div
            className="w-40 flex-none cursor-pointer transition md:w-48 md:hover:scale-105"
            onClick={() => songHandleClick(song, songs)}
        >
            <Image
                width={400}
                height={400}
                className="aspect-square w-full rounded-lg object-cover"
                src={song.internalImageUrl ?? "/song-placeholder.png"}
                alt={`Cover of ${song.name}`}
            />
            <span
                className="mt-2 block truncate text-center font-semibold hover:underline"
                onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/song/${song.publicId}`);
                }}
            >
                {song.name}
            </span>
            <span
                className="block truncate text-center text-sm text-gray-400 hover:underline"
                onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/artist/${song.artists[0].publicId}`);
                }}
            >
                {song.artists[0].name}
            </span>
        </div>
    );
}
