import type { SongDB } from "@/lib/db/song";
import { getImageUrl } from "@/lib/getImageUrl";
import { currentList } from "@/stores/currentList";
import { songHandleClick } from "../ListSongs/HandleClick";
import Image from "next/image";

export default function QuickSelectionsSong({
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
            className="flex items-center cursor-pointer gap-2 rounded-lg p-2 hover:bg-zinc-800 transition h-fit"
            onClick={handleClick}
        >
            {/* Imagen de la canción */}
            <Image
                width={100}
                height={100}
                className="rounded-sm w-12 h-12 object-cover"
                src={getImageUrl({
                    imageId: song.image,
                    height: 100,
                    width: 100,
                    placeHolder: "/song-placeholder.png",
                })}
                alt={`Song Cover for ${song.name}`}
            />
            {/* Información de la canción */}
            <div className="flex flex-col justify-center min-w-0">
                {/* Nombre de la canción */}
                <span className="text-md font-semibold text-white truncate">
                    {song.name}
                </span>
                {/* Artista y álbum */}
                <div className="flex items-center gap-1 min-w-0">
                    <span className="text-sm text-gray-400 flex-0 md:max-w-[50%] truncate shrink-0">
                        {song.artists[0].name}
                    </span>
                    <span className="hidden md:flex text-sm text-gray-400 truncate">
                        {" • "} {song.albumName}
                    </span>
                </div>
            </div>
        </div>
    );
}
