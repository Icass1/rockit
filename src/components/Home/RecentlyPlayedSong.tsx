import type { SongDB } from "@/lib/db/song";
import { getImageUrl } from "@/lib/getImageUrl";
import { currentList } from "@/stores/currentList";
import { songHandleClick } from "../ListSongs/HandleClick";
import { redirect } from "next/navigation";
import Image from "next/image";

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
            className="flex-none w-40 md:w-48 md:hover:scale-105 transition"
            onClick={handleClick}
        >
            <Image
                width={400}
                height={400}
                className="rounded-lg w-full aspect-square object-cover"
                src={getImageUrl({
                    imageId: song.image,
                    height: 400,
                    width: 400,
                    placeHolder: "/song-placeholder.png",
                })}
                alt="Song Cover"
            />
            <label
                className="truncate font-semibold text-center block mt-2"
                onClick={(event) => {
                    event.stopPropagation();
                    redirect(`/song/${song.id}`);
                }}
            >
                {song.name}
            </label>
            <label
                className="truncate text-sm text-center text-gray-400 block"
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
