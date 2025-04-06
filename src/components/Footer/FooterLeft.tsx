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
import { EllipsisVertical, PlayIcon, PauseIcon } from "lucide-react";
import { isPlayerUIVisible } from "@/stores/isPlayerUIVisible";
import { useState } from "react";
import { getImageUrl } from "@/lib/getImageUrl";
import Image from "next/image";
// import SongPopupMenu from "@/components/ListSongs/SongPopupMenu";

function FooterLeftForSong({ currentSong }: { currentSong: CurrentSong }) {
    return (
        // <!-- Para el Nicolás de mañana {currentSong && <LikeButton song={currentSong} />} -->
        <div className="flex items-center w-full md:w-1/3 max-w-full min-w-0 gap-x-4">
            {/* Imagen al inicio */}
            <Image
                width={64}
                height={64}
                src={getImageUrl({
                    imageId: currentSong?.image,
                    width: 64,
                    height: 64,
                    placeHolder: "/song-placeholder.png",
                })}
                alt="Album Cover"
                className="md:w-16 md:h-16 rounded-md select-none w-9 h-9"
            />

            {/* Parte central que se estira */}
            <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold flex flex-row gap-3 items-center">
                    <a
                        href={`/song/${currentSong?.id}`}
                        onClick={() => {
                            isPlayerUIVisible.set(false);
                        }}
                        className="md:hover:underline truncate line-clamp-1"
                    >
                        {currentSong?.name || "Canción desconocida :("}
                    </a>
                </span>
                <span
                    className="text-sm text-gray-400 flex flex-row gap-x-1 w-full"
                    onClick={() => {
                        isPlayerUIVisible.set(false);
                    }}
                >
                    <div className="flex-0 md:max-w-[50%] truncate shrink-0">
                        {currentSong?.artists ? (
                            currentSong?.artists?.map((artist, index) => (
                                <a
                                    href={`/artist/${artist.id}`}
                                    className="md:hover:underline"
                                    key={index}
                                >
                                    {artist.name}
                                    {index < currentSong.artists.length - 1
                                        ? ","
                                        : ""}
                                </a>
                            ))
                        ) : (
                            <div>Artista desconocido</div>
                        )}
                    </div>
                    <span className="hidden md:block select-none">•</span>
                    <a
                        href={`/album/${currentSong?.albumId}`}
                        className="hidden md:inline-block hover:underline truncate"
                    >
                        {currentSong?.albumName || "Album desconocido"}
                    </a>
                </span>
            </div>

            {/* Opciones al final */}
            <div className="pr-4 flex-row items-left hidden md:flex">
                {currentSong && <LikeButton song={currentSong} />}
                {currentSong && (
                    // <SongPopupMenu song={currentSong}>
                    <EllipsisVertical className="w-[22px] h-[24px] text-gray-400 md:hover:text-white md:hover:scale-105" />
                    // </SongPopupMenu>
                )}
            </div>
        </div>
    );
}

function FooterLeftForStation({ currentStation }: { currentStation: Station }) {
    const [hover, setHover] = useState(false);
    const $playing = useStore(playing);

    return (
        <div className="flex items-center w-full md:w-1/3 max-w-full min-w-0 gap-x-4">
            {/* Imagen al inicio */}
            <div
                className="md:w-16 md:h-16 w-9 h-9 relative rounded-md overflow-hidden"
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            >
                <Image
                    width={64}
                    height={64}
                    src={currentStation.favicon || "/song-placeholder.png"}
                    alt="Album Cover"
                    className="absolute w-full h-full select-none "
                />
                {$playing ? (
                    <PauseIcon
                        onClick={() => pause()}
                        className="absolute p-4 bg-neutral-500/70 transition-all"
                        style={{
                            display: hover ? "" : "none",
                            width: hover ? "100%" : "0%",
                            height: hover ? "100%" : "0%",
                        }}
                    />
                ) : (
                    <PlayIcon
                        onClick={() => play()}
                        className="absolute p-4 bg-neutral-500/70 transition-all"
                        style={{
                            display: hover ? "" : "none",
                            width: hover ? "100%" : "0%",
                            height: hover ? "100%" : "0%",
                        }}
                    />
                )}
            </div>
            {/* Parte central que se estira */}
            <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold flex flex-row gap-3 items-center truncate line-clamp-1">
                    {currentStation.name}
                </span>
                <span className="text-sm text-gray-400 flex flex-row gap-x-1 w-full">
                    {currentStation.country}
                </span>
            </div>

            {/* Opciones al final */}
            <div className="pr-4 flex-row items-left hidden md:flex">
                <EllipsisVertical className="w-[22px] h-[24px] text-gray-400 md:hover:text-white md:hover:scale-105" />
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
            <div className="flex items-center w-full md:w-1/3 max-w-full min-w-0 gap-x-4">
                You are not playing anything
            </div>
        );
    }
}
