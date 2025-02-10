import { useEffect, useRef, useState } from "react";
import { Play, ChevronLeft, ChevronRight, Pause } from "lucide-react";
import type { SongForStats } from "@/lib/stats";
import useWindowSize from "@/hooks/useWindowSize";
import {
    currentSong,
    pause,
    play,
    playing,
    playWhenReady,
    queue,
    queueIndex,
} from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { getImageUrl } from "@/lib/getImageUrl";

function Song({
    index,
    currentIndex,
    song,
    songsLength,
}: {
    index: number;
    currentIndex: number;
    song: SongForStats;
    songsLength: number;
}) {
    let distanceFromCenter = Math.abs(index - currentIndex);
    let neg = index > currentIndex ? -1 : 1;
    const [innerWidth] = useWindowSize();

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
    } else if (innerWidth < 768) {
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

    return (
        <div
            key={song.id}
            className={
                "h-full w-auto aspect-square absolute -translate-x-1/2 origin-center" +
                transition
            }
            style={{ left: left, zIndex: zIndex }}
        >
            <div
                className={
                    "h-full w-auto rounded-lg overflow-hidden bg-black relative" +
                    transition
                }
                style={{
                    scale: scale,
                }}
            >
                <img
                    src={getImageUrl({
                        imageId: song.image,
                        width: 300,
                        height: 300,
                        fallback: song.images[0]?.url,
                        placeHolder: "/song-placeholder.png",
                    })}
                    className={`${transition} top-1/2 relative -translate-y-1/2`}
                    style={{ filter: `brightness(${brightness})` }}
                />
                <div
                    className={`absolute  left-0 right-0 bottom-0 bg-gradient-to-b from-transparent to-black rounded-none ${transition} ${
                        index == currentIndex ? "h-52" : "h-0"
                    }`}
                />

                <label
                    className={`absolute bottom-9 text-lg md:text-2xl left-2 font-bold line-clamp-2 w-[75%] ${
                        index == currentIndex ? "opacity-100" : "opacity-0"
                    } ${transition}`}
                >
                    {song.name}
                </label>

                <label
                    className={`absolute bottom-2 left-2 text-md md:text-xl font-semibold line-clamp-1 w-[75%] ${
                        index == currentIndex ? "opacity-100" : "opacity-0"
                    } ${transition}`}
                >
                    {song.artists[0].name}
                </label>
                <button
                    className="absolute bottom-4 backdrop-blur-sm right-4 bg-transparent text-white p-3 rounded-full md:hover:bg-black/40 transition duration-300"
                    onClick={handleClick}
                >
                    {$currentSong?.id == song.id && $playing ? (
                        <Pause
                            className={`${transition} ${
                                index == currentIndex ? "h-5 w-5" : "h-0 w-0"
                            }`}
                        />
                    ) : (
                        <Play
                            className={`${transition} ${
                                index == currentIndex ? "h-5 w-5" : "h-0 w-0"
                            }`}
                        />
                    )}
                </button>
            </div>
        </div>
    );
}

function Version2({
    songs,
    currentIndex,
}: {
    songs: SongForStats[];
    currentIndex: number;
}) {
    return (
        <div className="relative md:w-full md:h-full w-64 h-64 md:max-h-[300px]">
            {songs.map((song, index) => (
                <Song
                    index={index}
                    currentIndex={currentIndex}
                    songsLength={songs.length}
                    song={song}
                    key={"song" + index}
                />
            ))}
        </div>
    );
}

function AlbumsCarousel({
    songsTimesPlayed,
}: {
    songsTimesPlayed: SongForStats[];
}) {
    const songs = songsTimesPlayed.slice(0, 20);

    const [currentIndex, setCurrentIndex] = useState(0);
    const divRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const autoRotateRef = useRef<NodeJS.Timeout | null>(null);
    const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleSwipe = () => {
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
    };

    const nextSlide = () => {
        setCurrentIndex((value) => (value < songs.length - 1 ? value + 1 : 0));
        pauseAndResetAutoRotate();
    };

    const prevSlide = () => {
        setCurrentIndex((value) => (value > 0 ? value - 1 : songs.length - 1));
        pauseAndResetAutoRotate();
    };

    const startAutoRotate = () => {
        stopAutoRotate();
        autoRotateRef.current = setInterval(() => {
            setCurrentIndex((value) =>
                value < songs.length - 1 ? value + 1 : 0
            );
        }, 3000);
    };

    const stopAutoRotate = () => {
        if (autoRotateRef.current) {
            clearInterval(autoRotateRef.current);
            autoRotateRef.current = null;
        }
    };

    const pauseAndResetAutoRotate = () => {
        stopAutoRotate();

        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
        }

        pauseTimeoutRef.current = setTimeout(() => {
            startAutoRotate();
        }, 2000); // Mas los 3000 de auto-rotar
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
    }, [songs.length]);

    // Inicia el auto-rotar al montar el componente
    useEffect(() => {
        startAutoRotate();
        return () => {
            stopAutoRotate();
            if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
        };
    }, []);

    return (
        <div
            className="text-white h-64 md:h-1/2 flex items-center justify-center overflow-x-hidden relative select-none"
            ref={divRef}
        >
            <ChevronLeft
                className="hidden md:flex z-[25] absolute left-24 h-10 w-10 bg-white text-[#6d6d6d] md:hover:text-black p-2 rounded-full shadow-md transition duration-300"
                onClick={prevSlide}
            />
            <Version2 songs={songs} currentIndex={currentIndex} />
            <ChevronRight
                className="hidden md:flex z-[25] absolute right-24 h-10 w-10 bg-white text-[#6d6d6d] md:hover:text-black p-2 rounded-full shadow-md transition duration-300"
                onClick={nextSlide}
            />
        </div>
    );
}

export default AlbumsCarousel;
