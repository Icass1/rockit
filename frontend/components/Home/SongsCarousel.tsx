"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { rockIt } from "@/lib/rockit/rockIt";
import { SongWithoutAlbum } from "@/lib/rockit/songWithoutAlbum";
import { useCarousel } from "@/components/Home/hooks/useCarousel";
import { songHandleClick } from "@/components/ListSongs/HandleClick";
import { StatsResponse } from "@/dto/stats/statsResponse";
import useFetch from "@/hooks/useFetch";
import useWindowSize from "@/hooks/useWindowSize";
import { useStore } from "@nanostores/react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

// Constantes de layout
const MOBILE_OFFSET = 15;
const DESKTOP_OFFSET = 9;
const MAX_VISIBLE = 4;

function getSongLayout(
    index: number,
    currentIndex: number,
    total: number,
    isMobile: boolean
) {
    let distance = Math.abs(index - currentIndex);
    let direction = index > currentIndex ? -1 : 1;

    // wrap-around
    if (distance > MAX_VISIBLE) {
        distance = total - Math.abs(index - currentIndex);
        direction = index > currentIndex ? 1 : -1;
    }

    if (distance > MAX_VISIBLE) {
        return { scale: 0.5, left: "50%", brightness: 0.1, zIndex: 0 };
    }

    const offset = isMobile ? MOBILE_OFFSET : DESKTOP_OFFSET;
    return {
        scale: 1 - distance * 0.1,
        left: `${50 + distance * direction * -offset}%`,
        brightness: Math.max(0, 1 - distance * 0.2),
        zIndex: 20 - distance,
    };
}

function CarouselSong({
    index,
    currentIndex,
    song,
    songs,
    total,
    isMobile,
}: {
    index: number;
    currentIndex: number;
    song: SongWithoutAlbum;
    songs: SongWithoutAlbum[];
    total: number;
    isMobile: boolean;
}) {
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);
    const $playing = useStore(rockIt.audioManager.playingAtom);

    const { scale, left, brightness, zIndex } = getSongLayout(
        index,
        currentIndex,
        total,
        isMobile
    );

    const isCenter = index === currentIndex;
    const isPlaying = $currentSong?.publicId === song.publicId && $playing;

    const handlePlay = () => {
        rockIt.queueManager.setCurrentList({
            type: "carousel",
            publicId: "carousel",
        });
        songHandleClick(song, songs);
    };

    return (
        <div
            className="absolute aspect-square h-full w-auto origin-center -translate-x-1/2 transition-all duration-300"
            style={{ left, zIndex }}
        >
            <div
                className="relative h-full w-auto overflow-hidden rounded-lg bg-black transition-all duration-300"
                style={{ scale: String(scale) }}
            >
                <Image
                    alt={song.name}
                    width={300}
                    height={300}
                    src={song.internalImageUrl ?? "/song-placeholder.png"}
                    className="relative top-1/2 aspect-square h-auto w-full -translate-y-1/2 transition-all duration-300"
                    style={{ filter: `brightness(${brightness})` }}
                    // Precarga las canciones adyacentes
                    priority={Math.abs(index - currentIndex) <= 1}
                    loading={undefined} // no mezclar priority con loading
                />

                {/* Gradiente + info — solo visible en centro */}
                <div
                    className={`absolute inset-x-0 bottom-0 rounded-none bg-linear-to-b from-transparent to-black transition-all duration-300 ${
                        isCenter ? "h-52" : "h-0"
                    }`}
                />
                <span
                    className={`absolute bottom-9 left-2 line-clamp-2 w-[75%] text-lg font-bold transition-all duration-300 md:text-2xl ${
                        isCenter ? "opacity-100" : "opacity-0"
                    }`}
                >
                    {song.name}
                </span>
                <span
                    className={`absolute bottom-2 left-2 line-clamp-1 w-[75%] text-sm font-semibold transition-all duration-300 md:text-xl ${
                        isCenter ? "opacity-100" : "opacity-0"
                    }`}
                >
                    {song.artists[0].name}
                </span>

                {isCenter && (
                    <button
                        aria-label={isPlaying ? "Pause" : "Play"}
                        className="absolute right-4 bottom-4 rounded-full p-3 text-white backdrop-blur-sm transition duration-300 md:hover:bg-black/40"
                        onClick={handlePlay}
                    >
                        {isPlaying ? (
                            <Pause className="h-5 w-5" />
                        ) : (
                            <Play className="h-5 w-5" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function SongsCarousel() {
    const [rawSongs] = useFetch(
        "/stats?type=songs&limit=20&sortBy=random&noRepeat=true",
        StatsResponse
    );
    const { width } = useWindowSize();
    const isMobile = (width ?? 0) < 768;
    const containerRef = useRef<HTMLDivElement>(null);

    const songs = rawSongs
        ? (rawSongs as unknown as SongWithoutAlbum[])
        : null;

    const { currentIndex, next, prev, onTouchStart, onTouchMove, onTouchEnd } =
        useCarousel(songs?.length ?? 0);

    // Touch events con passive: true para iOS
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !songs) return;

        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchmove", onTouchMove, { passive: true });
        el.addEventListener("touchend", onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", onTouchEnd);
        };
    }, [songs, onTouchStart, onTouchMove, onTouchEnd]);

    if (!songs) return null;

    return (
        <div
            ref={containerRef}
            className="relative flex h-64 min-h-64 items-center justify-center overflow-x-hidden text-white select-none md:min-h-92"
            // GPU acceleration para iOS
            style={{
                willChange: "transform",
                WebkitOverflowScrolling: "touch",
            }}
        >
            <ChevronLeft
                className="absolute left-24 z-25 hidden h-10 w-10 cursor-pointer rounded-full bg-white p-2 text-[#6d6d6d] shadow-md transition duration-300 md:flex md:hover:text-black"
                onClick={prev}
            />

            <div className="relative h-64 w-64 md:h-full md:max-h-75 md:w-full">
                {songs.map((song, index) => (
                    <CarouselSong
                        key={song.publicId}
                        index={index}
                        currentIndex={currentIndex}
                        song={song}
                        songs={songs}
                        total={songs.length}
                        isMobile={isMobile}
                    />
                ))}
            </div>

            <ChevronRight
                className="absolute right-24 z-25 hidden h-10 w-10 cursor-pointer rounded-full bg-white p-2 text-[#6d6d6d] shadow-md transition duration-300 md:flex md:hover:text-black"
                onClick={next}
            />
        </div>
    );
}
