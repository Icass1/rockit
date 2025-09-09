"use client";

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
import LikeButton from "@/components/LikeButton";
import { isMobilePlayerUIVisible } from "@/stores/isPlayerUIVisible";
import Slider from "@/components/Slider";
import { useEffect, useRef, useState } from "react";
import useWindowSize from "@/hooks/useWindowSize";
import { getImageUrl } from "@/lib/getImageUrl";
import MobilePlayerUIQueue from "@/components/PlayerUI/MobilePlayerUIQueue";
import MobilePlayerUILyrics from "@/components/PlayerUI/MobilePlayerUILyrics";
import SongPopupMenu from "@/components/ListSongs/SongPopupMenu";
import Image from "@/components/Image";

export default function MobilePlayerUI() {
    const $playing = useStore(playing);
    const $currentTime = useStore(currentTime);
    const $currentSong = useStore(currentSong);
    const $randomQueue = useStore(randomQueue);
    const $isMobilePlayerUIVisible = useStore(isMobilePlayerUIVisible);
    const innerWidth = useWindowSize().width;
    const [playerUIhidden, setPlayerUIHidden] = useState(
        !$isMobilePlayerUIVisible
    );
    const [playerUITop0, setPlayerUITop0] = useState($isMobilePlayerUIVisible);
    const [enableTransition, setEnableTransition] = useState(false);

    const [touchStart, setTouchStart] = useState([0, 0]);
    const [touchStartTime, setTouchStartTime] = useState(0);
    const [topOffset, setTopOffset] = useState(0);
    const [cancelHide, setCancelHide] = useState(false);

    const divRef = useRef<HTMLDivElement>(null);

    const [queueOpen, setQueueOpen] = useState(false);
    const [lyricsOpen, setLyricsOpen] = useState(false);

    const [shouldRender, setShouldRender] = useState(false);

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
                if (event.target instanceof HTMLDivElement) {
                    event.target.className.includes("context-menu-option");
                    return;
                }
                //isMobilePlayerUIVisible.set(false);
            }
        };
        document.addEventListener("click", handleDocumentClick);
        return () => {
            document.removeEventListener("click", handleDocumentClick);
        };
    }, [divRef, shouldRender]);

    useEffect(() => {
        setEnableTransition(true);
        if ($isMobilePlayerUIVisible) {
            setPlayerUIHidden(false);
            setTimeout(() => {
                setPlayerUITop0(true);
            }, 10);
        } else {
            setTimeout(() => {
                setPlayerUITop0(false);
                setTimeout(() => {
                    setPlayerUIHidden(!$isMobilePlayerUIVisible);
                }, 300);
            }, 10);
        }
        setTimeout(() => {
            setEnableTransition(false);
        }, 310);
    }, [$isMobilePlayerUIVisible]);

    useEffect(() => {
        const el = divRef.current;
        if (!el) return;

        const handleTouchStart = (e: TouchEvent) => {
            console.warn("handleTouchStart");
            if (
                document
                    .querySelector("#MobilePlayerUIQueue")
                    ?.contains(e.target as Node) ||
                document
                    .querySelector("#MobilePlayerUILyrics")
                    ?.contains(e.target as Node)
            )
                return;

            const touch = e.targetTouches[0];
            setTouchStart([touch.pageX, touch.pageY]);
            setTouchStartTime(new Date().getTime());
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (
                document
                    .querySelector("#MobilePlayerUIQueue")
                    ?.contains(e.target as Node) ||
                document
                    .querySelector("#MobilePlayerUILyrics")
                    ?.contains(e.target as Node)
            )
                return;
            if (cancelHide) {
                setTopOffset(0);
                return;
            }
            const touch = e.targetTouches[0];

            const offsetY = touch.pageY - touchStart[1];
            const offsetX = touch.pageX - touchStart[0];

            if (Math.abs(offsetY / offsetX) < 3) {
                setCancelHide(true);
                setTopOffset(0);
                return;
            }
            if (offsetY < 0) return;
            setTopOffset(offsetY);
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (
                document
                    .querySelector("#MobilePlayerUIQueue")
                    ?.contains(e.target as Node) ||
                document
                    .querySelector("#MobilePlayerUILyrics")
                    ?.contains(e.target as Node)
            )
                return;
            if (cancelHide) {
                setCancelHide(false);
                return;
            }
            setCancelHide(false);

            const time = new Date().getTime() - touchStartTime;

            if (topOffset / time > 0.7 || topOffset > window.innerHeight / 3) {
                setEnableTransition(true);
                setTimeout(() => {
                    setPlayerUIHidden(true);
                    isMobilePlayerUIVisible.set(false);
                    setEnableTransition(false);
                    setTopOffset(0);
                }, 300);

                setTopOffset(window.innerHeight);
            } else {
                setEnableTransition(true);
                setTimeout(() => {
                    setEnableTransition(false);
                }, 300);

                setTopOffset(0);
            }
        };

        el.addEventListener("touchmove", handleTouchMove, { passive: true });
        el.addEventListener("touchstart", handleTouchStart, { passive: true });
        el.addEventListener("touchend", handleTouchEnd, { passive: true });
        return () => {
            el.removeEventListener("touchmove", handleTouchMove);
            el.removeEventListener("touchstart", handleTouchStart);
            el.removeEventListener("touchend", handleTouchEnd);
        };
    }, [
        divRef,
        touchStart,
        touchStartTime,
        topOffset,
        cancelHide,
        shouldRender,
    ]);

    useEffect(() => {
        // Only run this on client
        if (!innerWidth) return;
        setShouldRender(innerWidth < 768);
    }, [innerWidth]);

    if (!shouldRender) return;

    return (
        <div
            ref={divRef}
            className={
                "fixed top-0 right-0 left-0 z-40 flex h-[calc(100%_-_3rem)] w-screen overflow-hidden md:hidden " +
                (playerUITop0 ? " top-0" : " top-full") +
                (playerUIhidden ? " hidden" : "") +
                (enableTransition ? " transition-[top] duration-300" : " ")
            }
            style={{ top: topOffset ? `${topOffset}px` : undefined }}
        >
            {/* Fondo blurreado */}
            <div
                className="absolute inset-0 -top-5 -right-5 -bottom-5 -left-5 bg-cover bg-center"
                style={{
                    backgroundImage: `url(${getImageUrl({
                        imageId: $currentSong?.image,
                        placeHolder: "/song-placeholder.png",
                        height: 100,
                        width: 100,
                    })})`,
                    filter: "blur(10px) brightness(0.5)",
                }}
            ></div>

            {/* Iconos en la parte superior */}
            <div className="absolute top-14 right-0 left-0 z-50 flex justify-between p-5">
                <ChevronDown
                    className="h-8 w-8 text-neutral-300"
                    onClick={() => isMobilePlayerUIVisible.set(false)}
                />
                {$currentSong ? (
                    <SongPopupMenu song={$currentSong}>
                        <Ellipsis className="h-6 w-8 text-neutral-300" />
                    </SongPopupMenu>
                ) : (
                    <Ellipsis className="h-6 w-8 text-neutral-300" />
                )}
            </div>

            {/* Contenido principal */}
            <div className="relative z-30 grid h-full w-full grid-rows-[1fr_min-content_min-content_min-content] items-center justify-center gap-y-2 px-4 pt-32 pb-20 text-white">
                {/* Imagen de la canción */}
                {/* <div className="max-w-full min-w-0 w-auto max-h-full min-h-0 h-auto aspect-square left-1/2 relative -translate-x-1/2 bg-blue-400"> */}
                <Image
                    src={getImageUrl({
                        imageId: $currentSong?.image,
                        placeHolder: "/song-placeholder.png",
                        height: 350,
                        width: 350,
                    })}
                    alt="Current song artwork"
                    className="relative left-1/2 aspect-square h-auto max-h-full min-h-0 w-auto max-w-full min-w-0 -translate-x-1/2 bg-blue-400"
                />
                {/* </div> */}

                {/* Título, artista y LikeButton */}
                <div className="flex w-full max-w-md items-center justify-between pr-7 pl-5">
                    <div className="text-left">
                        <h2 className="text-xl font-[650]">
                            {$currentSong?.name}
                        </h2>
                        <p className="font-semibold text-gray-300">
                            {$currentSong?.artists
                                .map((artist) => artist.name)
                                .join(", ")}
                        </p>
                    </div>
                    {$currentSong && <LikeButton song={$currentSong} />}
                </div>

                {/* Slider de duración */}
                <div className="w-full max-w-md px-4 py-3">
                    <Slider
                        id="default-slider"
                        value={$currentTime || 0}
                        className="h-2 w-full cursor-pointer appearance-none bg-neutral-700"
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
                <div className="relative left-1/2 flex w-fit -translate-x-1/2 items-center gap-3">
                    <button
                        className="flex h-12 w-12 items-center justify-center"
                        onClick={() => randomQueue.set(!randomQueue.get())}
                    >
                        <Shuffle
                            className={
                                "h-6 w-6 " +
                                ($randomQueue
                                    ? " text-[#ee1086]"
                                    : " text-white")
                            }
                        />
                    </button>

                    <button
                        className="flex h-12 w-12 items-center justify-center"
                        onClick={async () => {
                            await prev();
                            play();
                        }}
                    >
                        <SkipBack className="h-8 w-8 fill-current" />
                    </button>

                    <button className="flex h-16 w-16 items-center justify-center rounded-full">
                        {$playing ? (
                            <Pause
                                className="h-14 w-14 fill-current"
                                onClick={() => pause()}
                            />
                        ) : (
                            <Play
                                className="h-14 w-14 fill-current"
                                onClick={() => play()}
                            />
                        )}
                    </button>

                    <button
                        className="flex h-12 w-12 items-center justify-center"
                        onClick={async () => {
                            await next();
                            play();
                        }}
                    >
                        <SkipForward className="h-8 w-8 fill-current" />
                    </button>

                    <button className="flex h-12 w-12 items-center justify-center">
                        <Repeat className="h-6 w-6" />
                    </button>
                </div>

                {/* Otros Botones */}
                <div className="absolute right-0 bottom-0 left-0 flex items-center justify-around bg-gradient-to-t from-black/50 to-black/0 px-4 py-7 font-bold text-white">
                    <button
                        className="text-lg"
                        onClick={() => {
                            setQueueOpen(true);
                        }}
                    >
                        Queue
                    </button>
                    <button
                        className="text-lg"
                        onClick={() => {
                            setLyricsOpen(true);
                        }}
                    >
                        Lyrics
                    </button>
                    <button className="text-lg">Related</button>
                </div>
            </div>
            <MobilePlayerUIQueue open={queueOpen} setOpen={setQueueOpen} />
            <MobilePlayerUILyrics open={lyricsOpen} setOpen={setLyricsOpen} />
        </div>
    );
}
