import { useStore } from "@nanostores/react";
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Repeat,
    Shuffle,
    ChevronDown,
    Ellipsis,
} from "lucide-react";
import { getTime } from "@/lib/getTime";
import {
    currentSong,
    currentTime,
    next,
    pause,
    play,
    playing,
    prev,
    randomQueue,
    setTime,
} from "@/stores/audio";
import LikeButton from "../LikeButton.tsx";
import { isMobilePlayerUIVisible } from "@/stores/isPlayerUIVisible.ts";
import Slider from "../Slider.tsx";
import { useEffect, useRef } from "react";

export default function MusicPlayer() {
    const $playing = useStore(playing);
    const $currentTime = useStore(currentTime);
    const $currentSong = useStore(currentSong);
    const $randomQueue = useStore(randomQueue);
    const $isMobilePlayerUIVisible = useStore(isMobilePlayerUIVisible);

    const divRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!divRef.current) {
            return;
        }
        const handleDocumentClick = (event: MouseEvent) => {
            if (
                !divRef.current?.contains(event?.target as Node) &&
                !document
                    .querySelector("#grid-area-footer-mobile")
                    ?.contains(event?.target as Node)
            ) {
                isMobilePlayerUIVisible.set(false);
            }
        };
        document.addEventListener("click", handleDocumentClick);
        return () => {
            document.removeEventListener("click", handleDocumentClick);
        };
    }, [divRef]);

    return (
        <div
            ref={divRef}
            className={
                "fixed top-0 left-0 right-0 bottom-16 w-screen overflow-hidden md:hidden z-40 " +
                ($isMobilePlayerUIVisible ? "flex" : "hidden")
            }
        >
            {/* Fondo blurreado */}
            <div
                className="absolute -left-5 -right-5 -bottom-5 -top-5 inset-0 bg-center bg-cover"
                style={{
                    backgroundImage: `url(${$currentSong?.image ? `/api/image/${$currentSong.image}` : `/song-placeholder.png`})`,
                    filter: "blur(10px) brightness(0.5)",
                }}
            ></div>

            {/* Iconos en la parte superior */}
            <div className="absolute top-14 left-0 right-0 flex justify-between p-5 z-50">
                <ChevronDown
                    className="text-neutral-300 h-8 w-8"
                    onClick={() => isMobilePlayerUIVisible.set(false)}
                />
                <Ellipsis className="text-neutral-300 h-6 w-8" />
            </div>

            {/* Contenido principal */}
            <div className="relative z-30 flex flex-col items-center justify-center h-full text-white px-4">
                {/* Imagen de la canción */}
                <div className="mb-4 w-full aspect-square bg-gray-900 rounded-md shadow-md overflow-hidden">
                    <img
                        src={
                            $currentSong?.image
                                ? `/api/image/${$currentSong.image}`
                                : "/song-placeholder.png"
                        }
                        alt="Current song artwork"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Título, artista y LikeButton */}
                <div className="flex justify-between items-center w-full max-w-md pl-5 pr-7">
                    <div className="text-left">
                        <h2 className="text-xl font-[650]">
                            {$currentSong?.name}
                        </h2>
                        <p className="text-gray-300 font-semibold">
                            {$currentSong?.artists[0].name}
                        </p>
                    </div>
                    {$currentSong && <LikeButton song={$currentSong} />}
                </div>

                {/* Slider de duración */}
                <div className="w-full max-w-md px-4 py-3">
                    <Slider
                        id="default-slider"
                        value={$currentTime || 0}
                        className="h-2 w-full appearance-none cursor-pointer"
                        min={0}
                        max={$currentSong?.duration}
                        step={0.001}
                        onChange={(e) => setTime(Number(e.target.value))}
                    ></Slider>

                    {/* <input
                        type="range"
                        min="0"
                        max={$currentSong?.duration || 1}
                        value={$currentTime || 0}
                        onChange={(e) => setTime(Number(e.target.value))}
                        className="w-full h-[0.4rem] bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                    /> */}
                    <div className="flex justify-between text-sm text-neutral-100">
                        <span>{getTime($currentTime || 0)}</span>
                        <span>{getTime($currentSong?.duration || 0)}</span>
                    </div>
                </div>

                {/* Controles */}
                <div className="flex items-center gap-3">
                    <button
                        className="w-12 h-12 flex items-center justify-center"
                        onClick={() => randomQueue.set(!randomQueue.get())}
                    >
                        <Shuffle
                            className={
                                "w-6 h-6 " +
                                ($randomQueue
                                    ? " text-[#ee1086] "
                                    : " text-white ")
                            }
                        />
                    </button>

                    <button
                        className="w-12 h-12 flex items-center justify-center"
                        onClick={async () => {
                            await prev();
                            play();
                        }}
                    >
                        <SkipBack className="w-8 h-8 fill-current" />
                    </button>

                    <button className="w-16 h-16 flex items-center justify-center rounded-full">
                        {$playing ? (
                            <Pause
                                className="w-14 h-14 fill-current"
                                onClick={pause}
                            />
                        ) : (
                            <Play
                                className="w-14 h-14 fill-current"
                                onClick={play}
                            />
                        )}
                    </button>

                    <button
                        className="w-12 h-12 flex items-center justify-center"
                        onClick={async () => {
                            await next();
                            play();
                        }}
                    >
                        <SkipForward className="w-8 h-8 fill-current" />
                    </button>

                    <button className="w-12 h-12 flex items-center justify-center">
                        <Repeat className="w-6 h-6" />
                    </button>
                </div>

                {/* Otros Botones */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center px-4 py-7 text-white font-bold bg-gradient-to-t from-black to-black/0">
                    <button className="text-lg">Queue</button>
                    <button className="text-lg">Lyrics</button>
                    <button className="text-lg">Related</button>
                </div>
            </div>
        </div>
    );
}
