import { useEffect, useRef, useState } from "react";
import { Play, ChevronLeft, ChevronRight, Pause } from "lucide-react";
import type { SongForStats } from "@/lib/stats";
import {
    currentSong,
    pause,
    play,
    playing,
    queue,
    queueIndex,
} from "@/stores/audio";
import { useStore } from "@nanostores/react";

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

    if (distanceFromCenter > 4) {
        distanceFromCenter = songsLength - Math.abs(index - currentIndex);
        neg = neg = index > currentIndex ? 1 : -1;
    }

    let scale = `${1 - distanceFromCenter * 0.1}`; // Escalado en función de la distancia al centro
    const zIndex = 20 - distanceFromCenter; // Profundidad dinámica
    let left = `${50 + distanceFromCenter * neg * -9}%`; // Separación horizontal
    let brightness = 1 - distanceFromCenter * 0.2; // Brillo en función de la distancia al centro

    if (distanceFromCenter > 4) {
        scale = "0";
        distanceFromCenter = 4;
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
            currentSong.set(song);

            play();

            queueIndex.set(0);
            queue.set([song]);
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
                    src={
                        song.image
                            ? `/api/image/${song.image}`
                            : song.images[0].url
                    }
                    className={`${transition} top-1/2 relative -translate-y-1/2`}
                    style={{ filter: `brightness(${brightness})` }}
                />
                <div
                    className={`absolute  left-0 right-0 bottom-0 bg-gradient-to-b from-transparent to-black rounded-none ${transition} ${
                        index == currentIndex ? "h-20" : "h-0"
                    }`}
                />

                <label
                    className={`absolute bottom-9 text-2xl left-2 font-bold truncate w-full ${
                        index == currentIndex ? "opacity-100" : "opacity-0"
                    } ${transition}`}
                >
                    {song.name}
                </label>

                <label
                    className={`absolute bottom-2 left-2 text-xl font-semibold truncate w-full ${
                        index == currentIndex ? "opacity-100" : "opacity-0"
                    } ${transition}`}
                >
                    {song.artists[0].name}
                </label>
                <button
                    className="absolute bottom-4 backdrop-blur-sm right-4 bg-transparent text-white p-3 rounded-full hover:bg-black/40 transition duration-300"
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
        <div className="relative w-full h-full max-h-[300px]">
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
export default function AlbumsCarousel({
    songsTimesPlayed,
}: {
    songsTimesPlayed: SongForStats[];
}) {
    const songs = songsTimesPlayed.slice(0, 20);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [scrollIndex, setScrollIndex] = useState(0);
    const lastScrollIndex = useRef(0);
    const divRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!divRef.current) {
            return;
        }
        const handleScroll = (event: WheelEvent) => {
            if (event.deltaX) {
                event.stopPropagation();
                event.preventDefault();
                // console.log("1", event.deltaX);
                setScrollIndex((value) => (value += event.deltaX));
            }
        };

        divRef.current?.addEventListener("wheel", handleScroll);
    }, [divRef]);

    useEffect(() => {
        console.log(scrollIndex);

        if (Math.abs(lastScrollIndex.current - scrollIndex) > 500) {
            if (lastScrollIndex.current - scrollIndex > 0) {
                setCurrentIndex((value) =>
                    value > 0 ? value - 1 : songs.length - 1
                );
            } else {
                setCurrentIndex((value) =>
                    value < songs.length - 1 ? value + 1 : 0
                );
            }
            lastScrollIndex.current = scrollIndex;
        }
    }, [scrollIndex]);

    return (
        <div
            className="text-white h-1/2 flex items-center justify-center overflow-x-hidden relative select-none"
            ref={divRef}
        >
            <ChevronLeft
                className="z-30 absolute left-32 h-48 w-10 text-[#6d6d6d] hover:text-white p-2 rounded-full transition duration-300"
                onClick={() =>
                    setCurrentIndex((value) =>
                        value > 0 ? value - 1 : songs.length - 1
                    )
                }
            />
            <Version2 songs={songs} currentIndex={currentIndex} />

            <ChevronRight
                className="z-30 absolute right-32 h-48 w-10 text-[#6d6d6d] hover:text-white p-2 rounded-full transition duration-300"
                onClick={() =>
                    setCurrentIndex((value) =>
                        value < songs.length - 1 ? value + 1 : 0
                    )
                }
            />
        </div>
    );
}
