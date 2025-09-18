import { currentList } from "@/stores/currentList";
import { songHandleClick } from "@/components/ListSongs/HandleClick";
import { redirect } from "next/navigation";
import { RockItSongType } from "@/types/rockIt";
import Image from "next/image";

export default function RecentlyPlayedSong({
    song,
    songs,
}: {
    song: RockItSongType;
    songs: RockItSongType[];
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
