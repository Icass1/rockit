"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, ChevronLeft, ChevronRight, Pause } from "lucide-react";
import useWindowSize from "@/hooks/useWindowSize";
import { currentSong, playing } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { songHandleClick } from "@/components/ListSongs/HandleClick";
import { currentList } from "@/stores/currentList";
import useFetch from "@/hooks/useFetch";
import { StatsResponse } from "@/responses/stats/statsResponse";
import { RockItSong } from "@/types/rockIt";
import Image from "next/image";

function Song({
    index,
    currentIndex,
    song,
    songsLength,
    songs,
}: {
    index: number;
    currentIndex: number;
    song: RockItSong;
    songsLength: number;
    songs: RockItSong[];
}) {
    let distanceFromCenter = Math.abs(index - currentIndex);
    let neg = index > currentIndex ? -1 : 1;
    const innerWidth = useWindowSize().width;

    if (distanceFromCenter > 4) {
        distanceFromCenter = songsLength - Math.abs(index - currentIndex);
        neg = neg = index > currentIndex ? 1 : -1;
    }

    let scale: string;
    const zIndex = 20 - distanceFromCenter; // Profundidad dinámica
    let left: string;
    let brightness: number;

    if (distanceFromCenter > 4) {
        scale = "0.5";
        left = "50%";
        brightness = 0.1;
    } else if (innerWidth && innerWidth < 768) {
        scale =
            distanceFromCenter > 4 ? "0" : `${1 - distanceFromCenter * 0.1}`;
        left = `${50 + distanceFromCenter * neg * -15}%`; // Separación horizontal
        brightness = 1 - distanceFromCenter * 0.2; // Brillo en función de la distancia al centro
    } else {
        scale =
            distanceFromCenter > 4 ? "0" : `${1 - distanceFromCenter * 0.1}`;
        left = `${50 + distanceFromCenter * neg * -9}%`; // Separación horizontal
        brightness = 1 - distanceFromCenter * 0.2; // Brillo en función de la distancia al centro
    }

    const transition = " transition-all duration-300 ";

    const $currentSong = useStore(currentSong);
    const $playing = useStore(playing);

    const handleClick = () => {
        currentList.set({ type: "carousel", id: "carousel" });
        songHandleClick(
            { ...song, path: "this path is not needed but cannot be empty" },
            songs.map((song) => {
                return {
                    ...song,
                    path: "this path is not needed but cannot be empty",
                };
            })
        );
    };

    return (
        <div
            key={song.publicId}
            className={
                "absolute aspect-square h-full w-auto origin-center -translate-x-1/2" +
                transition
            }
            style={{ left: left, zIndex: zIndex }}
        >
            <div
                className={
                    "relative h-full w-auto overflow-hidden rounded-lg bg-black" +
                    transition
                }
                style={{
                    scale: scale,
                }}
            >
                <Image
                    alt={song.name}
                    width={300}
                    height={300}
                    src={song.internalImageUrl ?? "song-placeholder.png"}
                    className={`${transition} relative top-1/2 aspect-square h-auto w-full -translate-y-1/2`}
                    style={{ filter: `brightness(${brightness})` }}
                />
                <div
                    className={`absolute right-0 bottom-0 left-0 rounded-none bg-gradient-to-b from-transparent to-black ${transition} ${
                        index == currentIndex ? "h-52" : "h-0"
                    }`}
                />

                <label
                    className={`absolute bottom-9 left-2 line-clamp-2 w-[75%] text-lg font-bold md:text-2xl ${
                        index == currentIndex ? "opacity-100" : "opacity-0"
                    } ${transition}`}
                >
                    {song.name}
                </label>

                <label
                    className={`text-md absolute bottom-2 left-2 line-clamp-1 w-[75%] font-semibold md:text-xl ${
                        index == currentIndex ? "opacity-100" : "opacity-0"
                    } ${transition}`}
                >
                    {song.artists[0].name}
                </label>
                {distanceFromCenter == 0 && (
                    <button
                        className="absolute right-4 bottom-4 rounded-full bg-transparent p-3 text-white backdrop-blur-sm transition duration-300 md:hover:bg-black/40"
                        onClick={handleClick}
                    >
                        {$currentSong?.id == song.publicId && $playing ? (
                            <Pause
                                className={`${transition} ${
                                    index == currentIndex
                                        ? "h-5 w-5"
                                        : "h-0 w-0"
                                }`}
                            />
                        ) : (
                            <Play
                                className={`${transition} ${
                                    index == currentIndex
                                        ? "h-5 w-5"
                                        : "h-0 w-0"
                                }`}
                            />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

function Version2({
    songs,
    currentIndex,
}: {
    songs: RockItSong[];
    currentIndex: number;
}) {
    return (
        <div className="relative h-64 w-64 md:h-full md:max-h-[300px] md:w-full">
            {songs?.map((song, index) => (
                <Song
                    index={index}
                    currentIndex={currentIndex}
                    songsLength={songs.length}
                    song={song}
                    songs={songs}
                    key={"song" + index}
                />
            ))}
        </div>
    );
}

function SongsCarousel() {
    const [songs] = useFetch<StatsResponse>(
        "/stats?type=songs&limit=20&sortBy=random&noRepeat=true",
        { json: true }
    );

    const [currentIndex, setCurrentIndex] = useState(0);
    const divRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const autoRotateRef = useRef<NodeJS.Timeout | null>(null);
    const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const startAutoRotate = useCallback(() => {
        if (!songs) return;

        stopAutoRotate();
        autoRotateRef.current = setInterval(() => {
            setCurrentIndex((value) =>
                value < songs.length - 1 ? value + 1 : 0
            );
        }, 3000);
    }, [songs]);

    const pauseAndResetAutoRotate = useCallback(() => {
        stopAutoRotate();

        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
        }

        pauseTimeoutRef.current = setTimeout(() => {
            startAutoRotate();
        }, 2000);
    }, [startAutoRotate]);

    const nextSlide = useCallback(() => {
        if (!songs) return;
        setCurrentIndex((value) => (value < songs.length - 1 ? value + 1 : 0));
        pauseAndResetAutoRotate();
    }, [pauseAndResetAutoRotate, songs]);

    const prevSlide = useCallback(() => {
        if (!songs) return;
        setCurrentIndex((value) => (value > 0 ? value - 1 : songs.length - 1));
        pauseAndResetAutoRotate();
    }, [pauseAndResetAutoRotate, songs]);

    const handleSwipe = useCallback(() => {
        if (!touchStartX.current || !touchEndX.current) return;

        const distance = touchStartX.current - touchEndX.current;

        if (Math.abs(distance) > 50) {
            if (distance > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }

        touchStartX.current = null;
        touchEndX.current = null;
    }, [nextSlide, prevSlide]);

    const stopAutoRotate = () => {
        if (autoRotateRef.current) {
            clearInterval(autoRotateRef.current);
            autoRotateRef.current = null;
        }
    };

    useEffect(() => {
        const div = divRef.current;

        if (!div) return;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX.current = e.touches[0].clientX;
        };

        const handleTouchMove = (e: TouchEvent) => {
            touchEndX.current = e.touches[0].clientX;
        };

        const handleTouchEnd = () => {
            handleSwipe();
        };

        div.addEventListener("touchstart", handleTouchStart, { passive: true });
        div.addEventListener("touchmove", handleTouchMove, { passive: true });
        div.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            div.removeEventListener("touchstart", handleTouchStart);
            div.removeEventListener("touchmove", handleTouchMove);
            div.removeEventListener("touchend", handleTouchEnd);
        };
    }, [songs, handleSwipe]);

    // Inicia el auto-rotar al montar el componente
    useEffect(() => {
        startAutoRotate();
        return () => {
            stopAutoRotate();
            if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
        };
    }, [startAutoRotate]);

    if (!songs) return;

    return (
        <div
            className="relative flex h-64 min-h-64 items-center justify-center overflow-x-hidden text-white select-none md:min-h-92"
            ref={divRef}
        >
            <ChevronLeft
                className="absolute left-24 z-[25] hidden h-10 w-10 rounded-full bg-white p-2 text-[#6d6d6d] shadow-md transition duration-300 md:flex md:hover:text-black"
                onClick={prevSlide}
            />
            <Version2 songs={songs} currentIndex={currentIndex} />
            <ChevronRight
                className="absolute right-24 z-[25] hidden h-10 w-10 rounded-full bg-white p-2 text-[#6d6d6d] shadow-md transition duration-300 md:flex md:hover:text-black"
                onClick={nextSlide}
            />
        </div>
    );
}

export default SongsCarousel;
