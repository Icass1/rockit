import { redirect } from "next/navigation";
import Image from "next/image";
import { RockItSongWithoutAlbum } from "@/lib/rockit/rockItSongWithoutAlbum";

export default function RecentlyPlayedSong({
    song,
    songs,
}: {
    song: RockItSongWithoutAlbum;
    songs: RockItSongWithoutAlbum[];
}) {
    console.log("RecentlyPlayedSong", { songs });

    return (
        <div
            className="w-40 flex-none transition md:w-48 md:hover:scale-105"
            onClick={() => {
                console.warn("RecentlyPlayedSong handleClick");
            }}
        >
            <Image
                width={400}
                height={400}
                className="aspect-square w-full rounded-lg object-cover"
                src={song.internalImageUrl ?? "song-placeholder.png"}
                alt="Song Cover"
            />
            <label
                className="mt-2 block truncate text-center font-semibold"
                onClick={(event) => {
                    event.stopPropagation();
                    redirect(`/song/${song.publicId}`);
                }}
            >
                {song.name}
            </label>
            <label
                className="block truncate text-center text-sm text-gray-400"
                onClick={(event) => {
                    event.stopPropagation();
                    redirect(`/artist/${song.artists[0].publicId}`);
                }}
            >
                {song.artists[0].name}
            </label>
        </div>
    );
}
