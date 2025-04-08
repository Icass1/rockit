import type { SongDB } from "@/lib/db/song";
import { getImageUrl } from "@/lib/getImageUrl";
import { currentList } from "@/stores/currentList";
import { songHandleClick } from "@/components/ListSongs/HandleClick";
import Image from "@/components/Image";

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
            className="flex h-fit cursor-pointer items-center gap-2 rounded-lg p-2 transition hover:bg-zinc-800"
            onClick={handleClick}
        >
            {/* Imagen de la canción */}
            <Image
                width={100}
                height={100}
                className="aspect-square h-12 min-h-12 w-12 min-w-12 rounded-sm object-cover"
                src={getImageUrl({
                    imageId: song.image,
                    height: 100,
                    width: 100,
                    placeHolder: "/song-placeholder.png",
                })}
                alt={`Song Cover for ${song.name}`}
            />
            {/* Información de la canción */}
            <div className="flex min-w-0 flex-col justify-center">
                {/* Nombre de la canción */}
                <span className="text-md truncate font-semibold text-white">
                    {song.name}
                </span>
                {/* Artista y álbum */}
                <span className="flex-0 shrink-0 truncate text-sm text-gray-400 md:max-w-[50%]">
                    {song.artists[0].name}
                    {" • "} {song.albumName}
                </span>
            </div>
        </div>
    );
}
