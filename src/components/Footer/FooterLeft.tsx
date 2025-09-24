"use client";

import { useStore } from "@nanostores/react";
import LikeButton from "@/components/LikeButton";
import {
    EllipsisVertical,
    PlayIcon,
    PauseIcon,
    Pause,
    Play,
} from "lucide-react";
import { useEffect, useState } from "react";
import SongPopupMenu from "@/components/ListSongs/SongPopupMenu";
import Link from "next/link";
import { rockitIt } from "@/lib/rockit";
import Image from "next/image";
import { Station } from "@/types/station";
import { RockItSongType } from "@/types/rockIt";

function FooterLeftForSong({ currentSong }: { currentSong: RockItSongType }) {
    const $playing = useStore(rockitIt.audioManager.playingAtom);

    const $queue = useStore(rockitIt.queueManager.queueAtom);

    // const $currentCrossFade = useStore(currentCrossFade);
    // const $crossFadeCurrentTime = useStore(crossFadeCurrentTime);

    const $currentCrossFade = 0;
    const $crossFadeCurrentTime = 0;

    console.warn("Fix get first element in queue if index is too high");

    const [overwriteOpacity, setOverwriteOpacity] = useState<
        undefined | number
    >(undefined);

    useEffect(() => {
        if ($crossFadeCurrentTime && $currentCrossFade)
            setOverwriteOpacity((value) => {
                if (!value) return $crossFadeCurrentTime / $currentCrossFade;
                return $crossFadeCurrentTime / $currentCrossFade;
                // return Math.max(value, $crossFadeCurrentTime / $crossFade);
            });
    }, [$crossFadeCurrentTime, $currentCrossFade]);

    if (!$queue) {
        return false;
    }

    return (
        <div className="grid w-full max-w-full min-w-0 grid-cols-[min-content_1fr_min-content] items-center gap-x-4 pr-2 md:w-1/3">
            {/* Imagen al inicio */}
            <div
                className="group relative h-9 w-9 cursor-pointer rounded-md md:h-16 md:w-16"
                onClick={rockitIt.audioManager.togglePlayPause}
            >
                {/* Imagen del álbum */}
                <div className="relative h-9 w-9 rounded-md md:h-16 md:w-16">
                    <Image
                        width={64}
                        height={64}
                        src={
                            currentSong?.internalImageUrl ??
                            "/song-placeholder.png"
                        }
                        alt="Album Cover"
                        style={{ opacity: 1 }}
                        className="absolute h-9 w-9 rounded-md object-cover transition duration-300 select-none group-hover:brightness-50 md:h-16 md:w-16"
                    />
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                    {$playing ? (
                        <Pause
                            className="h-6 w-6 fill-current text-white md:h-8 md:w-8"
                            onClick={rockitIt.audioManager.pause}
                        />
                    ) : (
                        <Play
                            className="h-6 w-6 fill-current text-white md:h-8 md:w-8"
                            onClick={rockitIt.audioManager.play}
                        />
                    )}
                </div>
            </div>

            {/* Parte central que se estira */}
            <div
                className="relative h-full w-full max-w-full min-w-0 overflow-hidden"
                style={{
                    perspectiveOrigin: "50% 50%",
                    perspective: "400px",
                }}
            >
                <div
                    className="absolute h-full w-full truncate"
                    style={{
                        transform: `rotate3d(1, 0, 0, ${0 * 45 - 45 * (overwriteOpacity ?? 0)}deg)`,
                        transformOrigin: `0px 50% -80px`,
                        transformStyle: "preserve-3d",
                        backfaceVisibility: "hidden",
                    }}
                >
                    <div className="relative top-1/2 flex -translate-y-1/2 flex-col">
                        <span className="flex flex-row items-center gap-3 font-semibold">
                            <Link
                                href={`/song/${currentSong?.publicId}`}
                                onClick={rockitIt.playerUIManager.hide}
                                className="w-full max-w-full min-w-0 truncate md:hover:underline"
                            >
                                {currentSong?.name || "Canción desconocida :("}
                            </Link>
                        </span>
                        <span
                            className="flex w-full flex-row gap-x-1 text-sm text-gray-400"
                            onClick={rockitIt.playerUIManager.hide}
                        >
                            <div className="truncate">
                                {currentSong?.artists ? (
                                    currentSong?.artists?.map(
                                        (artist, index) => (
                                            <Link
                                                href={`/artist/${artist.publicId}`}
                                                className="md:hover:underline"
                                                key={index}
                                            >
                                                {artist.name}
                                                {index <
                                                currentSong.artists.length - 1
                                                    ? ","
                                                    : ""}
                                            </Link>
                                        )
                                    )
                                ) : (
                                    <div>Artista desconocido</div>
                                )}
                            </div>
                            <span className="hidden select-none md:block">
                                •
                            </span>
                            <Link
                                href={`/album/${currentSong.album.publicId}`}
                                className="hidden truncate hover:underline md:inline-block"
                            >
                                {currentSong.album.name || "Album desconocido"}
                            </Link>
                        </span>
                    </div>
                </div>
            </div>

            {/* Opciones al final */}
            <div className="items-left hidden flex-row gap-1 md:flex">
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
    const $playing = useStore(rockitIt.audioManager.playingAtom);

    const $lang = useStore(rockitIt.languageManager.langDataAtom);

    if (!$lang) {
        return false;
    }

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
                    src={currentStation?.favicon || "/song-placeholder.png"}
                    alt="Album Cover"
                    className="absolute h-full w-full select-none"
                />
                {$playing ? (
                    <PauseIcon
                        onClick={rockitIt.audioManager.pause}
                        className="absolute bg-neutral-500/70 p-4 transition-all"
                        style={{
                            display: hover ? "" : "none",
                            width: hover ? "100%" : "0%",
                            height: hover ? "100%" : "0%",
                        }}
                    />
                ) : (
                    <PlayIcon
                        onClick={rockitIt.audioManager.play}
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
                    {currentStation?.name}
                </span>
                <span className="flex w-full flex-row gap-x-1 text-sm text-gray-400">
                    {currentStation?.country}
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
    const $currentSong = useStore(rockitIt.queueManager.currentSongAtom);
    const $currentStation = useStore(
        rockitIt.stationManager.currentStationAtom
    );

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
