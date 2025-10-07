import SongContextMenu from "../ListSongs/SongContextMenu";
import Image from "next/image";
import { RockItSongWithAlbum } from "@/lib/rockit/rockItSongWithAlbum";

export default function QuickSelectionsSong({
    song,
    songs,
}: {
    song: RockItSongWithAlbum;
    songs: RockItSongWithAlbum[];
}) {
    console.log("QuickSelectionsSong", { songs });

    return (
        <SongContextMenu
            onPlay={() => {
                console.warn("QuickSelectionsSong handleClick");
            }}
            song={song}
        >
            <div
                className="flex h-fit cursor-pointer items-center gap-2 rounded-lg p-2 transition hover:bg-zinc-800"
                onClick={() => console.warn("QuickSelectionsSong handleClick")}
            >
                {/* Imagen de la canción */}
                <Image
                    width={100}
                    height={100}
                    className="aspect-square h-12 min-h-12 w-12 min-w-12 rounded-sm object-cover"
                    src={song.internalImageUrl ?? "/song-placeholder-png"}
                    alt={`Song Cover for ${song.name}`}
                />
                {/* Información de la canción */}
                <div className="flex w-full max-w-full min-w-0 flex-col justify-center">
                    {/* Nombre de la canción */}
                    <span className="text-md w-full max-w-full min-w-0 truncate font-semibold text-white">
                        {song.name}
                    </span>
                    {/* Artista y álbum */}
                    <span className="w-full max-w-full min-w-0 truncate text-sm text-gray-400">
                        {song.artists[0].name}
                        {" • "} {song.album.name}
                    </span>
                </div>
            </div>
        </SongContextMenu>
    );
}
