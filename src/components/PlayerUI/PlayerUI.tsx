"use client";

import {
    currentSong,
    queue,
    queueIndex,
    type QueueElement,
} from "@/stores/audio";
import { isPlayerUIVisible } from "@/stores/isPlayerUIVisible";
import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState } from "react";
import useWindowSize from "@/hooks/useWindowSize";
import { getImageUrl } from "@/lib/getImageUrl";
import { QueueSong } from "./QueueSong";
import { DynamicLyrics } from "./DynamicLyrics";
import Image from "../Image";

export default function PlayerUI() {
    // Estas dos cosas son para el mockup del related
    const columns = Array.from({ length: 5 });
    const songsPerColumn = 3;

    const [queueScroll, setQueueScroll] = useState(0);

    const $currentSong = useStore(currentSong);

    const [currentTab, setCurrentTab] = useState("queue");

    const $isPlayerUIVisible = useStore(isPlayerUIVisible);
    const $queue = useStore(queue);

    const divRef = useRef<HTMLDivElement>(null);
    const innerWidth = useWindowSize().width;

    useEffect(() => {
        if (!divRef.current) {
            return;
        }
        const handleDocumentClick = (event: MouseEvent) => {
            if (
                !divRef.current?.contains(event?.target as Node) &&
                !document
                    .querySelector("#footer")
                    ?.contains(event?.target as Node)
            ) {
                isPlayerUIVisible.set(false);
            }
        };
        document.addEventListener("click", handleDocumentClick);
        return () => {
            document.removeEventListener("click", handleDocumentClick);
        };
    }, [divRef]);

    const [draggingSong, setDraggingSong] = useState<
        QueueElement | undefined
    >();
    const [draggingPos, setDraggingPos] = useState<[number, number]>([0, 0]);
    const queueDivRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseUp = (event: globalThis.MouseEvent) => {
            if (!queueDivRef.current || !draggingSong) return;
            let spacerIndex = undefined;
            if (queueDivRef.current?.offsetTop) {
                spacerIndex = Math.floor(
                    (event.clientY -
                        32 -
                        queueDivRef.current.getBoundingClientRect().top +
                        queueDivRef.current.scrollTop -
                        30) /
                        64
                );
            }

            const prevSongs = queue.get();
            if (!prevSongs) return;

            const tempDraggingSong = prevSongs.find(
                (song) => song.song.id == draggingSong.song.id
            );
            if (typeof tempDraggingSong == "undefined") return;
            if (typeof spacerIndex == "undefined") return;

            const draggingSongIndex = prevSongs.indexOf(tempDraggingSong);

            if (spacerIndex > draggingSongIndex) {
                queue.set([
                    ...prevSongs.slice(0, draggingSongIndex),
                    ...prevSongs.slice(draggingSongIndex + 1, spacerIndex + 2),
                    tempDraggingSong,
                    ...prevSongs.slice(spacerIndex + 2),
                ]);
            } else if (spacerIndex < draggingSongIndex) {
                queue.set([
                    ...prevSongs.slice(0, spacerIndex + 1),
                    tempDraggingSong,
                    ...prevSongs.slice(spacerIndex + 1, draggingSongIndex),
                    ...prevSongs.slice(draggingSongIndex + 1),
                ]);
            }

            setDraggingSong(undefined);
        };
        const handleMouseMove = (event: globalThis.MouseEvent) => {
            if (!queueDivRef.current) return;
            setDraggingPos([event.clientX - 10, event.clientY - 32]);
        };

        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("mousemove", handleMouseMove);

        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, [queueDivRef, draggingSong]);

    useEffect(() => {
        if (!$isPlayerUIVisible) return;

        const index = queue
            .get()
            ?.findIndex((_song) => _song.index == queueIndex.get());

        if (!index) return;

        if (queueDivRef.current) {
            queueDivRef.current.scrollTop = index * 64;
        }
    }, [$isPlayerUIVisible, queueDivRef]);

    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        // Only run this on client
        setShouldRender(innerWidth > 768);
    }, [innerWidth]);

    if (!shouldRender) return;

    return (
        <div
            ref={divRef}
            className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black/80 pt-20 pb-24 pl-12 transition-all duration-300"
            style={{
                top: $isPlayerUIVisible ? "0%" : "100%",
                height: "calc(100%)",
            }}
        >
            <div className="relative grid h-full w-full grid-cols-[1fr_1fr] gap-x-2 bg-black px-2 text-white lg:grid-cols-[30%_40%_30%]">
                <Image
                    alt={$currentSong?.name}
                    src={getImageUrl({
                        imageId: $currentSong?.image,
                        width: 200,
                        height: 200,
                        placeHolder: "/song-placeholder.png",
                    })}
                    className="absolute top-1/2 h-auto w-full -translate-y-1/2 blur-md brightness-50"
                />

                <div className="relative z-10 hidden h-full w-full lg:block">
                    <h2 className="absolute mx-auto block w-full p-14 text-center text-3xl font-bold">
                        Lyrics
                    </h2>
                    <DynamicLyrics />
                </div>

                {/* Middle Column: Cover & Info */}
                <div className="z-10 flex max-h-full min-h-0 w-full max-w-full min-w-0 flex-col items-center justify-center">
                    <div className="aspect-square max-h-[70%]">
                        <Image
                            src={getImageUrl({
                                imageId: $currentSong?.image,
                                placeHolder: "/song-placeholder.png",
                            })}
                            alt="Song Cover"
                            className="mx-auto aspect-square h-[100%] w-auto rounded-lg object-cover"
                        />
                    </div>
                    <div className="mt-2 flex w-full flex-col items-center justify-center px-2 text-center">
                        <h1 className="line-clamp-2 text-4xl leading-normal font-bold text-balance">
                            {$currentSong?.name}
                        </h1>
                        <p className="mt-2 flex w-full items-center justify-center gap-1 text-xl font-medium text-gray-400">
                            <span className="max-w-[75%] truncate text-center md:hover:underline">
                                {$currentSong?.albumName}
                            </span>
                            <span>•</span>
                            {$currentSong?.artists &&
                            $currentSong.artists.length > 0 ? (
                                <a
                                    href={`/artist/${$currentSong.artists[0].id}`}
                                    className="truncate md:hover:underline"
                                    key={$currentSong.artists[0].id}
                                >
                                    {$currentSong.artists[0].name}
                                </a>
                            ) : (
                                <span>Artista desconocido</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Right Column: Queue */}
                <div className="z-10 flex h-full flex-col overflow-hidden bg-gradient-to-r from-[rgba(0,0,0,0)] to-[rgba(0,0,0,0.5)] select-none">
                    {/* Selector */}
                    <div className="relative flex items-center justify-center gap-10 border-b border-white pt-6 pb-4">
                        <button
                            className={`text-lg font-semibold transition ${
                                currentTab === "queue"
                                    ? "border-b-2 border-white text-white"
                                    : "text-gray-400 md:hover:text-white"
                            }`}
                            onClick={() => setCurrentTab("queue")}
                        >
                            Queue
                        </button>
                        <button
                            className={`text-lg font-semibold transition ${
                                currentTab === "recommended"
                                    ? "border-b-2 border-white text-white"
                                    : "text-gray-400 md:hover:text-white"
                            }`}
                            onClick={() => setCurrentTab("recommended")}
                        >
                            Related
                        </button>
                    </div>
                    {/* Contenido dinámico */}
                    <div
                        className="relative flex-1 overflow-auto scroll-smooth pt-3 pb-7"
                        ref={queueDivRef}
                        onScroll={(e) =>
                            setQueueScroll(e.currentTarget.scrollTop)
                        }
                    >
                        {currentTab === "queue" && $queue ? (
                            <>
                                <div
                                    style={{ height: $queue.length * 64 }}
                                ></div>
                                {$queue
                                    .filter(
                                        (song) =>
                                            song.song.id !=
                                            draggingSong?.song.id
                                    )
                                    .map((queueSong, index) => {
                                        if (
                                            queueSong.song.id ==
                                            draggingSong?.song.id
                                        ) {
                                            return;
                                        }

                                        let spacerIndex = undefined;

                                        if (queueDivRef.current?.offsetTop) {
                                            spacerIndex = Math.floor(
                                                (draggingPos[1] -
                                                    queueDivRef.current.getBoundingClientRect()
                                                        .top +
                                                    queueDivRef.current
                                                        .scrollTop -
                                                    30) /
                                                    64
                                            );
                                        }

                                        let top = index * 64;

                                        if (
                                            draggingSong &&
                                            typeof spacerIndex != "undefined" &&
                                            spacerIndex < index
                                        ) {
                                            top += 64;
                                        }
                                        if (
                                            draggingSong &&
                                            index == 0 &&
                                            spacerIndex == -1
                                        ) {
                                            top -= 64;
                                        }

                                        if (
                                            (queueDivRef.current
                                                ?.offsetHeight &&
                                                top >
                                                    queueDivRef.current
                                                        ?.offsetHeight +
                                                        queueScroll) ||
                                            top < queueScroll - 64
                                        ) {
                                            return;
                                        }
                                        return (
                                            <div
                                                key={
                                                    queueSong.song.id +
                                                    queueSong.index
                                                }
                                                id={
                                                    queueSong.song.id +
                                                    queueSong.index
                                                }
                                                className="absolute w-full transition-[top] duration-500"
                                                style={{
                                                    top: `${top}px`,
                                                    transitionTimingFunction:
                                                        "cubic-bezier(1,-0.53, 0.09, 1.58)",
                                                }}
                                            >
                                                {draggingSong &&
                                                    spacerIndex == -1 &&
                                                    index == 0 && (
                                                        <div className="h-16 bg-transparent"></div>
                                                    )}
                                                <QueueSong
                                                    song={queueSong}
                                                    onDrag={() => {
                                                        setDraggingSong(
                                                            queueSong
                                                        );
                                                    }}
                                                />
                                                {draggingSong &&
                                                    typeof spacerIndex !=
                                                        "undefined" &&
                                                    spacerIndex == index && (
                                                        <div className="h-16 bg-transparent"></div>
                                                    )}
                                            </div>
                                        );
                                    })}

                                {draggingSong && queueDivRef.current && (
                                    <div
                                        className="absolute w-full"
                                        style={{
                                            top: `${
                                                draggingPos[1] +
                                                queueScroll -
                                                queueDivRef.current.getBoundingClientRect()
                                                    .y
                                            }px`,
                                            // left: `${draggingPos[0]}px`,
                                        }}
                                    >
                                        <QueueSong
                                            song={draggingSong}
                                            dragging
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <section>
                                    <h2 className="text-left text-2xl font-bold">
                                        Similar Songs
                                    </h2>
                                    <div className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 py-2 md:[scrollbar-gutter:stable]">
                                        {/* Aquí creamos las columnas */}
                                        {columns.map((_, columnIndex) => (
                                            <div
                                                key={columnIndex}
                                                className="flex w-[calc(50%-10px)] max-w-[300px] flex-none snap-center flex-col gap-1"
                                            >
                                                {Array.from({
                                                    length: songsPerColumn,
                                                }).map((_, songIndex) => (
                                                    <a
                                                        href="#"
                                                        key={songIndex}
                                                        className="flex h-fit items-center gap-2 rounded-lg p-2 transition hover:bg-zinc-800"
                                                    >
                                                        {/* Imagen de la canción */}
                                                        <Image
                                                            className="h-12 w-12 rounded-sm object-cover"
                                                            src="/song-placeholder.png"
                                                            alt={`Song ${
                                                                columnIndex *
                                                                    songsPerColumn +
                                                                songIndex +
                                                                1
                                                            }`}
                                                        />

                                                        {/* Información de la canción */}
                                                        <div className="flex min-w-0 flex-col justify-center">
                                                            {/* Nombre de la canción */}
                                                            <span className="text-md truncate font-semibold text-white">
                                                                Song{" "}
                                                                {columnIndex *
                                                                    songsPerColumn +
                                                                    songIndex +
                                                                    1}
                                                            </span>

                                                            {/* Artista y álbum */}
                                                            <span className="truncate text-sm text-gray-400">
                                                                Artist{" "}
                                                                {columnIndex *
                                                                    songsPerColumn +
                                                                    songIndex +
                                                                    1}{" "}
                                                                • Album{" "}
                                                                {columnIndex *
                                                                    songsPerColumn +
                                                                    songIndex +
                                                                    1}
                                                            </span>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h2 className="pt-7 text-left text-2xl font-bold">
                                        Artists you may like
                                    </h2>
                                    <div className="scrollbar-hide flex snap-x snap-mandatory gap-7 overflow-x-auto px-2 py-4">
                                        {/* Aquí creamos las columnas de artistas */}
                                        {columns.map((_, artistIndex) => (
                                            <div
                                                key={artistIndex}
                                                className="flex flex-none snap-center flex-col items-center gap-2"
                                            >
                                                {/* Imagen del artista */}
                                                <Image
                                                    className="h-28 w-28 rounded-full object-cover"
                                                    src="/user-placeholder.png"
                                                    alt={`Artist ${
                                                        artistIndex + 1
                                                    }`}
                                                />
                                                {/* Nombre del artista */}
                                                <span className="text-md truncate text-center font-semibold text-white">
                                                    Artist {artistIndex + 1}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h2 className="pt-7 text-left text-2xl font-bold">
                                        Song / Artist Description
                                    </h2>
                                    <a className="line-clamp-4 px-5 pt-2 text-justify">
                                        Lorem ipsum dolor sit amet, consectetur
                                        adipiscing elit, sed do eiusmod tempor
                                        incididunt ut labore et dolore magna
                                        aliqua. Ut enim ad minim veniam, quis
                                        nostrud exercitation ullamco laboris
                                        nisi ut aliquip ex ea commodo consequat.
                                        Duis aute irure dolor in reprehenderit
                                        in voluptate velit esse cillum dolore eu
                                        fugiat nulla pariatur. Excepteur sint
                                        occaecat cupidatat non proident, sunt in
                                        culpa qui officia deserunt mollit anim
                                        id est laborum.
                                    </a>
                                </section>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
