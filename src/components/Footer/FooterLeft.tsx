import {
    currentSong,
    currentStation,
    pause,
    play,
    playing,
    type CurrentSong,
    type Station,
} from "@/stores/audio";
import { useStore } from "@nanostores/react";
import LikeButton from "@/components/LikeButton";
import {
    EllipsisVertical,
    PlayIcon,
    PauseIcon,
    Pause,
    Play,
} from "lucide-react";
import { isPlayerUIVisible } from "@/stores/isPlayerUIVisible";
import { useState } from "react";
import { getImageUrl } from "@/lib/getImageUrl";
import Image from "@/components/Image";
import SongPopupMenu from "@/components/ListSongs/SongPopupMenu";
import Link from "next/link";

function FooterLeftForSong({ currentSong }: { currentSong: CurrentSong }) {
    const $playing = useStore(playing);

    return (
        <div className="flex w-full max-w-full min-w-0 items-center gap-x-4 md:w-1/3">
            {/* Imagen al inicio */}
            <div
                className="group relative h-9 w-9 cursor-pointer rounded-md md:h-16 md:w-16"
                onClick={() => ($playing ? pause() : play())}
            >
                {/* Imagen del álbum */}
                <Image
                    width={64}
                    height={64}
                    src={getImageUrl({
                        imageId: currentSong?.image,
                        width: 64,
                        height: 64,
                        placeHolder: "/api/image/song-placeholder.png",
                    })}
                    alt="Album Cover"
                    className="h-9 w-9 rounded-md object-cover transition duration-300 select-none group-hover:brightness-50 md:h-16 md:w-16"
                />

                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                    {$playing ? (
                        <Pause
                            className="h-6 w-6 fill-current text-white md:h-8 md:w-8"
                            onClick={() => pause()}
                        />
                    ) : (
                        <Play
                            className="h-6 w-6 fill-current text-white md:h-8 md:w-8"
                            onClick={() => play()}
                        />
                    )}
                </div>
            </div>

            {/* Parte central que se estira */}
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-row items-center gap-3 font-semibold">
                    <Link
                        href={`/song/${currentSong?.id}`}
                        onClick={() => {
                            isPlayerUIVisible.set(false);
                        }}
                        className="w-full max-w-full min-w-0 truncate md:hover:underline"
                    >
                        {currentSong?.name || "Canción desconocida :("}
                    </Link>
                </span>
                <span
                    className="flex w-full flex-row gap-x-1 text-sm text-gray-400"
                    onClick={() => {
                        isPlayerUIVisible.set(false);
                    }}
                >
                    <div className="truncate">
                        {currentSong?.artists ? (
                            currentSong?.artists?.map((artist, index) => (
                                <Link
                                    href={`/artist/${artist.id}`}
                                    className="md:hover:underline"
                                    key={index}
                                >
                                    {artist.name}
                                    {index < currentSong.artists.length - 1
                                        ? ","
                                        : ""}
                                </Link>
                            ))
                        ) : (
                            <div>Artista desconocido</div>
                        )}
                    </div>
                    <span className="hidden select-none md:block">•</span>
                    <Link
                        href={`/album/${currentSong?.albumId}`}
                        className="hidden truncate hover:underline md:inline-block"
                    >
                        {currentSong?.albumName || "Album desconocido"}
                    </Link>
                </span>
            </div>

            {/* Opciones al final */}
            <div className="items-left hidden flex-row pr-4 md:flex">
                {currentSong && <LikeButton song={currentSong} />}
                {currentSong && (
                    <SongPopupMenu song={currentSong}>
                        <EllipsisVertical className="h-[24px] w-[22px] text-gray-400 md:hover:scale-105 md:hover:text-white" />
                    </SongPopupMenu>
                )}
            </div>
        </div>
    );
}

function FooterLeftForStation({ currentStation }: { currentStation: Station }) {
    const [hover, setHover] = useState(false);
    const $playing = useStore(playing);

    return (
        <div className="flex w-full max-w-full min-w-0 items-center gap-x-4 md:w-1/3">
            {/* Imagen al inicio */}
            <div
                className="relative h-9 w-9 overflow-hidden rounded-md md:h-16 md:w-16"
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            >
                <Image
                    width={64}
                    height={64}
                    src={
                        currentStation.favicon ||
                        "/api/image/song-placeholder.png"
                    }
                    alt="Album Cover"
                    className="absolute h-full w-full select-none"
                />
                {$playing ? (
                    <PauseIcon
                        onClick={() => pause()}
                        className="absolute bg-neutral-500/70 p-4 transition-all"
                        style={{
                            display: hover ? "" : "none",
                            width: hover ? "100%" : "0%",
                            height: hover ? "100%" : "0%",
                        }}
                    />
                ) : (
                    <PlayIcon
                        onClick={() => play()}
                        className="absolute bg-neutral-500/70 p-4 transition-all"
                        style={{
                            display: hover ? "" : "none",
                            width: hover ? "100%" : "0%",
                            height: hover ? "100%" : "0%",
                        }}
                    />
                )}
            </div>
            {/* Parte central que se estira */}
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-1 flex flex-row items-center gap-3 truncate font-semibold">
                    {currentStation.name}
                </span>
                <span className="flex w-full flex-row gap-x-1 text-sm text-gray-400">
                    {currentStation.country}
                </span>
            </div>

            {/* Opciones al final */}
            <div className="items-left hidden flex-row pr-4 md:flex">
                <EllipsisVertical className="h-[24px] w-[22px] text-gray-400 md:hover:scale-105 md:hover:text-white" />
            </div>
        </div>
    );
}

export default function FooterLeft() {
    const $currentSong = useStore(currentSong);
    const $currentStation = useStore(currentStation);

    if ($currentSong) {
        return <FooterLeftForSong currentSong={$currentSong} />;
    } else if ($currentStation) {
        return <FooterLeftForStation currentStation={$currentStation} />;
    } else {
        return (
            <div className="flex w-full max-w-full min-w-0 items-center gap-x-4 md:w-1/3">
                You are not playing anything
            </div>
        );
    }
}
