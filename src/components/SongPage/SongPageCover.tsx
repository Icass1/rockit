"use client";

import type { SongDB } from "@/db/song";
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
import { downloadedSongs } from "@/stores/downloads";
import { downloads } from "@/stores/downloads";
import { useStore } from "@nanostores/react";
import { Download, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

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
    const $downloadedSongs = useStore(downloadedSongs);

    const [_song, setSong] =
        useState<
            SongDB<
                | "image"
                | "path"
                | "id"
                | "albumName"
                | "albumId"
                | "artists"
                | "name"
                | "images"
                | "duration"
            >
        >(song);

    const handleClick = () => {
        if (_song.path == undefined || _song.path == "") {
            fetch(
                `/api/start-download?url=https://open.spotify.com/track/${_song.id}`
            ).then((response) => {
                response.json().then((data) => {
                    downloads.set([data.download_id, ...downloads.get()]);
                });
            });
            return;
        }

        if (!_song.path) {
            return;
        }

        if ($currentSong?.id == _song.id && $playing) {
            pause();
        } else if ($currentSong?.id == _song.id) {
            play();
        } else {
            playWhenReady.set(true);
            currentSong.set(_song);

            queueIndex.set(0);
            queue.set([{ song: _song, list: undefined, index: 0 }]);
        }
    };

    useEffect(() => {
        if ($downloadedSongs.includes(_song.id)) {
            let retries = 0;

            const fetchNewSong = () => {
                fetch(`/api/song/${_song.id}`)
                    .then((response) => response.json())
                    .then((data) => {
                        setSong(data);
                    })
                    .catch(() => {
                        retries += 1;

                        if (retries > 5) return;
                        setTimeout(() => {
                            fetchNewSong();
                        }, 1000);
                    });
            };
            fetchNewSong();
        }
    }, [$downloadedSongs]);

    const iconClassName =
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all z-20" +
        (hover ? " w-20 h-20 " : " w-0 h-0 ");

    return (
        <div className="relative w-full h-full max-w-md">
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
                        (_song?.image
                            ? `/api/image/${_song.image}`
                            : album?.album.images[0].url) ||
                        "/song-placeholder.png"
                    }
                    alt="Carátula de la canción"
                    className={
                        "w-full h-full absolute transition-all z-10 " +
                        (hover ? "brightness-[60%]" : "")
                    }
                />

                {_song.path == undefined || _song.path == "" ? (
                    <Download className={iconClassName} />
                ) : $currentSong?.id == _song.id && $playing ? (
                    <Pause className={iconClassName} fill="white" />
                ) : (
                    <Play className={iconClassName} fill="white" />
                )}
            </div>
        </div>
    );
}