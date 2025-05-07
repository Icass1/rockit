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
import { downloads } from "@/stores/downloads";
import { useStore } from "@nanostores/react";
import { Download, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "../Image";

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
    inDatabase: boolean;
}) {
    const [hover, setHover] = useState(false);

    const $currentSong = useStore(currentSong);
    const $playing = useStore(playing);

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
        console.warn("TODO");
        setSong((value) => value);
    }, []);

    const iconClassName =
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all z-20" +
        (hover ? " w-20 h-20 " : " w-0 h-0 ");

    return (
        <div className="relative h-full w-full max-w-md">
            {/* Contenedor principal */}
            <div
                className="relative aspect-square h-auto w-full max-w-md cursor-pointer overflow-hidden rounded-lg object-cover select-none"
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onClick={handleClick}
            >
                {/* Imagen principal */}
                <Image
                    src={
                        (_song?.image
                            ? `/api/image/${_song.image}`
                            : album?.album.images[0].url) ||
                        "/song-placeholder.png"
                    }
                    alt="Carátula de la canción"
                    className={
                        "absolute z-10 h-full w-full transition-all " +
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
