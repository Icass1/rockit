import type { SongDB } from "@/lib/db";
import type { GetAlbum } from "@/lib/getAlbum";
import { currentSong, play, queue, queueIndex } from "@/stores/audio";
import { PlayCircle, Play } from "lucide-react";
import { useState } from "react";

export default function SongPageCover({
    song,
    album,
}: {
    song: SongDB<
        | "image"
        | "path"
        | "id"
        | "albumName"
        | "albumId"
        | "artists"
        | "name"
        | "images"
        | "duration"
    >;
    album: GetAlbum;
}) {
    const [hover, setHover] = useState(false);

    const handleClick = () => {
        if (!song.path) {
            return;
        }
        currentSong.set(song);
        play();

        queueIndex.set(0);
        queue.set([song]);
    };

    return (
        <div className="relative w-full h-full max-w-md">
            {/* Imagen con blur como fondo */}
            <img
                src={
                    (song?.image
                        ? `/api/image/${song.image}`
                        : album?.album.images[0].url) || "/song-placeholder.png"
                }
                alt="Carátula desenfocada de la canción"
                className="absolute z-10 w-full max-w-md h-auto blur-3xl brightness-105"
            />

            {/* Contenedor principal */}
            <div
                className="w-full max-w-md h-auto object-cover aspect-square rounded-lg overflow-hidden relative cursor-pointer"
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onClick={handleClick}
            >
                {/* Imagen principal */}
                <img
                    src={
                        (song?.image
                            ? `/api/image/${song.image}`
                            : album?.album.images[0].url) ||
                        "/song-placeholder.png"
                    }
                    alt="Carátula de la canción"
                    className={
                        "w-full h-full absolute transition-all z-10 " +
                        (hover ? "brightness-[60%]" : "")
                    }
                />

                {/* Icono de Play */}
                <Play
                    className={
                        "absolute top-1/2 left-1/2 w-20 h-20 fill-transparent -translate-x-1/2 -translate-y-1/2 stroke-0 transition-all duration-75 z-20" +
                        (hover ? " stroke-1 fill-white" : "")
                    }
                ></Play>
            </div>
        </div>
    );
}
