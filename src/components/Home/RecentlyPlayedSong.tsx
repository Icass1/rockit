import type { SongDB } from "@/lib/db/song";
import { getImageUrl } from "@/lib/getImageUrl";
import { currentList } from "@/stores/currentList";
import { songHandleClick } from "@/components/ListSongs/HandleClick";
import { redirect } from "next/navigation";
import Image from "@/components/Image";

export default function RecentlyPlayedSong({
    song,
    songs,
}: {
    song: SongDB<
        | "name"
        | "image"
        | "artists"
        | "id"
        | "albumName"
        | "albumId"
        | "duration"
    >;
    songs: SongDB<
        | "name"
        | "image"
        | "artists"
        | "id"
        | "albumName"
        | "albumId"
        | "duration"
    >[];
}) {
    const handleClick = () => {
        currentList.set({ type: "recently-played", id: "recently-played" });
        songHandleClick(
            { ...song, path: "this path is not needed but cannot be empty" },
            songs.map((song) => {
                return {
                    ...song,
                    path: "this path is not needed but cannot be empty",
                };
            })
        );
    };

    return (
        <div
            className="w-40 flex-none transition md:w-48 md:hover:scale-105"
            onClick={handleClick}
        >
            <Image
                width={400}
                height={400}
                className="aspect-square w-full rounded-lg object-cover"
                src={getImageUrl({
                    imageId: song.image,
                    height: 400,
                    width: 400,
                    placeHolder: "/song-placeholder.png",
                })}
                alt="Song Cover"
            />
            <label
                className="mt-2 block truncate text-center font-semibold"
                onClick={(event) => {
                    event.stopPropagation();
                    redirect(`/song/${song.id}`);
                }}
            >
                {song.name}
            </label>
            <label
                className="block truncate text-center text-sm text-gray-400"
                onClick={(event) => {
                    event.stopPropagation();
                    redirect(`/artist/${song.artists[0].id}`);
                }}
            >
                {song.artists[0].name}
            </label>
        </div>
    );
}
