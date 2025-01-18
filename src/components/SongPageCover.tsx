import type { SongDB } from "@/lib/db";
import type { GetAlbum } from "@/lib/getAlbum";
import {
    currentSong,
    pause,
    play,
    playing,
    playWhenReady,
    queue,
    queueIndex,
} from "@/stores/audio";
import { downloads } from "@/stores/downloads";
import { useStore } from "@nanostores/react";
import { Download, Pause, Play } from "lucide-react";
import { useState } from "react";

export default function SongPageCover({
    song,
    album,
    inDatabase,
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
    inDatabase: boolean;
}) {
    const [hover, setHover] = useState(false);

    const $currentSong = useStore(currentSong);
    const $playing = useStore(playing);

    const handleClick = () => {
        if (!inDatabase || song.path == undefined) {
            fetch(
                `/api/start-download?url=https://open.spotify.com/track/${song.id}`
            ).then((response) => {
                response.json().then((data) => {
                    downloads.set([data.download_id, ...downloads.get()]);
                });
            });
            return;
        }

        if (!song.path) {
            return;
        }

        if ($currentSong?.id == song.id && $playing) {
            pause();
        } else if ($currentSong?.id == song.id) {
            play();
        } else {
            playWhenReady.set(true);
            currentSong.set(song);

            queueIndex.set(0);
            queue.set([{ song: song, list: undefined, index: 0 }]);
        }
    };

    const iconClassName =
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all z-20" +
        (hover ? " w-20 h-20 " : " w-0 h-0 ");

    return (
        <div className="relative w-full h-full max-w-md">
            {/* Imagen con blur como fondo */}
            {/* <img
                src={
                    (song?.image
                        ? `/api/image/${song.image}`
                        : album?.album.images[0].url) || "/song-placeholder.png"
                }
                alt="Carátula desenfocada de la canción"
                className="absolute z-10 w-full max-w-md h-auto blur-3xl brightness-105 scale-110"
            /> */}

            {/* Contenedor principal */}
            <div
                className="w-full max-w-md h-auto object-cover aspect-square rounded-lg overflow-hidden relative cursor-pointer select-none"
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

                {!inDatabase || song.path == undefined ? (
                    <Download className={iconClassName} />
                ) : $currentSong?.id == song.id && $playing ? (
                    <Pause className={iconClassName} fill="white" />
                ) : (
                    <Play className={iconClassName} fill="white" />
                )}
            </div>
        </div>
    );
}
