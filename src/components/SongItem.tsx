import { songHandleClick } from "@/components/ListSongs/HandleClick";
import type { SongDB } from "@/lib/db";

export default function SongItem({
    song,
}: {
    song: SongDB<
        | "image"
        | "id"
        | "name"
        | "artists"
        | "albumId"
        | "albumName"
        | "path"
        | "duration"
    >;
    index: number;
}) {
    return (
        <a
            className="flex items-center gap-2 rounded-lg p-2 hover:bg-zinc-800 transition h-fit"
            onClick={() => songHandleClick(song)}
        >
            {/* Imagen de la canción */}
            <img
                className="rounded-sm w-12 h-12 object-cover"
                src={song.image ? `/api/image/${song.image}` : '/song-placeholder.png'}
                alt={`Song Cover for ${song.name}`}
            />
            {/* Información de la canción */}
            <div className="flex flex-col justify-center min-w-0">
                {/* Nombre de la canción */}
                <span className="text-md font-semibold text-white truncate">{song.name}</span>
                {/* Artista y álbum */}
                <div className="flex items-center gap-1 min-w-0">
                    <span className="text-sm text-gray-400 flex-0 md:max-w-[50%] truncate shrink-0">
                        {song.artists[0].name}
                    </span>
                    <span className="hidden md:flex text-sm text-gray-400 truncate">
                        {' • '} {song.albumName}
                    </span>
                </div>
            </div>
        </a>
    );
};
