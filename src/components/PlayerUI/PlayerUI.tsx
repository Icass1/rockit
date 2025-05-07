"use client";

import {
    currentSong,
    pause,
    play,
    playing,
    playWhenReady,
    queue,
    queueIndex,
    saveSongToIndexedDB,
    type QueueElement,
} from "@/stores/audio";
import { isPlayerUIVisible } from "@/stores/isPlayerUIVisible";
import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState } from "react";
import useWindowSize from "@/hooks/useWindowSize";
import { getImageUrl } from "@/lib/getImageUrl";
import { QueueSong } from "./QueueSong";
import { DynamicLyrics } from "./DynamicLyrics";
import Image from "@/components/Image";
import Link from "next/link";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenuOption from "@/components/ContextMenu/Option";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import {
    GripVertical,
    HardDriveDownload,
    ListPlus,
    ListX,
    Pause,
    Play,
    PlayCircle,
} from "lucide-react";
import { SongDB } from "@/lib/db/song";
import { langData } from "@/stores/lang";

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

    const [draggingSong, setDraggingSong] = useState<
        | {
              list: string;
              song: QueueElement;
              index: number;
          }
        | undefined
    >();

    const [draggingPosY, setDraggingPosY] = useState(0);
    const draggingPosYRef = useRef(0);

    const queueDivRef = useRef<HTMLDivElement>(null);

    const [shouldRender, setShouldRender] = useState(false);

    const scrollContainerTopRef = useRef(0);

    const $queueIndex = useStore(queueIndex);
    const $playing = useStore(playing);

    const mouseDown = (
        event: React.MouseEvent,
        song: QueueElement,
        index: number
    ) => {
        const scrollContainerTop =
            queueDivRef.current?.getBoundingClientRect().top || 0;
        scrollContainerTopRef.current = scrollContainerTop;

        setDraggingSong({ list: "queue", song, index });
        setDraggingPosY(event.clientY);
        draggingPosYRef.current = event.clientY;
    };

    const handleRemoveSong = (song: QueueElement) => {
        if (song.index == queueIndex.get()) {
            // Alert the user that the song is currently playing cannot be removed.
            return;
        }

        const tempQueue = queue.get();
        if (!tempQueue) return;

        const index = tempQueue.findIndex((_song) => _song.index == song.index);
        if (index === -1 || typeof index == "undefined") return;

        queue.set([
            ...tempQueue.slice(0, index),
            ...tempQueue.slice(index + 1),
        ]);
    };

    const handlePlaySong = async (song: QueueElement) => {
        const tempQueue = queue.get();
        if (!tempQueue) return;

        const currentSongIndexInQueue = tempQueue.findIndex(
            (_song) => _song.index == song.index
        );
        queueIndex.set(tempQueue[currentSongIndexInQueue].index);

        const newSongId = tempQueue.find(
            (song) => song.index == queueIndex.get()
        )?.song.id;
        if (!newSongId) return;

        await fetch(`/api/song/${newSongId}`)
            .then((response) => response.json())
            .then((data: SongDB) => {
                playWhenReady.set(true);
                currentSong.set(data);
            });
    };

    useEffect(() => {
        if (!draggingSong) return;
        const handleTouchMove = (event: MouseEvent) => {
            setDraggingPosY(Math.round(event.clientY * 100) / 100);
            draggingPosYRef.current = Math.round(event.clientY * 100) / 100;
        };

        const handleTouchEnd = () => {
            setDraggingSong(undefined);

            const tempQueue = queue.get();
            if (!tempQueue) return;

            if (typeof queueDivRef.current?.scrollTop != "number") return;
            const indexInQueue = Math.floor(
                (draggingPosYRef.current -
                    185 +
                    32 +
                    queueDivRef.current?.scrollTop) /
                    64
            );

            if (draggingSong.index == indexInQueue) return;
            else if (draggingSong.index < indexInQueue) {
                queue.set([
                    ...tempQueue.slice(0, draggingSong.index),
                    ...tempQueue.slice(
                        draggingSong.index + 1,
                        indexInQueue + 1
                    ),
                    draggingSong.song,
                    ...tempQueue.slice(indexInQueue + 1),
                ]);
            } else {
                queue.set([
                    ...tempQueue.slice(0, indexInQueue),
                    draggingSong.song,
                    ...tempQueue.slice(indexInQueue, draggingSong.index),
                    ...tempQueue.slice(draggingSong.index + 1),
                ]);
            }
        };

        document.addEventListener("mousemove", handleTouchMove);
        document.addEventListener("mouseup", handleTouchEnd);
        return () => {
            document.removeEventListener("mousemove", handleTouchMove);
            document.removeEventListener("mouseup", handleTouchEnd);
        };
    }, [draggingSong]);

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
    }, [divRef, shouldRender]);

    useEffect(() => {
        if (!$isPlayerUIVisible) return;

        const index = queue
            .get()
            ?.findIndex((_song) => _song.index == queueIndex.get());

        if (!index) return;

        if (queueDivRef.current) {
            queueDivRef.current.scrollTop = index * 64;
        }
    }, [$isPlayerUIVisible, queueDivRef, shouldRender]);

    useEffect(() => {
        // Only run this on client
        if (!innerWidth) return;
        setShouldRender(innerWidth > 768);
    }, [innerWidth]);

    const [showIcon, setShowIcon] = useState(false);

    useEffect(() => {
        if (!showIcon) return;
        const t = setTimeout(() => setShowIcon(false), 800); // dura 0.8 s
        return () => clearTimeout(t);
    }, [showIcon]);

    const $lang = useStore(langData);

    if (!$lang || !$queue || !shouldRender) return null;

    const iconClassName =
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 z-20 transition-all z-20 p-5 duration-500" +
        (showIcon ? " opacity-100" : " opacity-0");

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
                    className="absolute top-1/2 h-auto w-full -translate-y-1/2 blur-md brightness-50 select-none"
                />

                <div className="relative z-10 hidden h-full w-full lg:block">
                    <h2 className="absolute mx-auto block w-full p-14 text-center text-3xl font-bold select-none">
                        Lyrics
                    </h2>
                    <DynamicLyrics />
                </div>

                {/* Middle Column: Cover & Info */}
                <div className="z-10 flex max-h-full min-h-0 w-full max-w-full min-w-0 flex-col items-center justify-center">
                    <div
                        className="relative mx-auto aspect-square h-[100%] max-h-[70%] w-auto rounded-lg object-cover"
                        onClick={() => {
                            setShowIcon(true);
                            if ($playing) {
                                pause();
                            } else {
                                play();
                            }
                        }}
                    >
                        <Image
                            src={getImageUrl({
                                imageId: $currentSong?.image,
                                placeHolder: "/song-placeholder.png",
                            })}
                            alt="Song Cover"
                            className="absolute h-full w-full rounded-xl select-none"
                        />
                        <div
                            className={`h-20 w-20 rounded-full bg-[#1a1a1a]/60 ${iconClassName}`}
                        >
                            {$playing ? (
                                <Pause className={iconClassName} fill="white" />
                            ) : (
                                <Play className={iconClassName} fill="white" />
                            )}
                        </div>
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
                                <Link
                                    href={`/artist/${$currentSong.artists[0].id}`}
                                    className="truncate md:hover:underline"
                                    key={$currentSong.artists[0].id}
                                >
                                    {$currentSong.artists[0].name}
                                </Link>
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
                                {$queue.map((queueSong, index) => {
                                    if (!queueDivRef.current) return;

                                    let top: number;

                                    let draggingTop: number | undefined;
                                    const isDragging =
                                        draggingSong?.song.song.id ===
                                        queueSong.song.id;

                                    if (draggingSong)
                                        draggingTop = Math.max(
                                            draggingPosY -
                                                185 +
                                                queueDivRef.current.scrollTop,
                                            0
                                        );

                                    if (
                                        draggingSong?.song.song.id ==
                                            queueSong.song.id &&
                                        typeof draggingTop == "number"
                                    ) {
                                        top = draggingTop;
                                    } else {
                                        top = index * 64;
                                    }

                                    if (
                                        typeof draggingTop == "number" &&
                                        typeof draggingSong?.index ==
                                            "number" &&
                                        draggingSong?.index != index &&
                                        draggingTop - 32 < top &&
                                        draggingSong?.index * 64 > top
                                    ) {
                                        top += 64;
                                    }

                                    if (
                                        typeof draggingTop == "number" &&
                                        typeof draggingSong?.index ==
                                            "number" &&
                                        draggingSong?.index != index &&
                                        draggingTop + 32 > top &&
                                        draggingSong?.index * 64 < top
                                    ) {
                                        top -= 64;
                                    }

                                    if (
                                        (queueDivRef.current?.offsetHeight &&
                                            top >
                                                queueDivRef.current
                                                    ?.offsetHeight +
                                                    queueScroll) ||
                                        top < queueScroll - 74
                                    ) {
                                        return;
                                    }
                                    return (
                                        <div
                                            key={`${queueSong.song.id}-${queueSong.index}`}
                                            className={`absolute w-full ${isDragging ? "z-10" : "transition-[top] duration-200"}`}
                                            style={{
                                                top: `${(typeof top === "number" ? top : 0) + 20}px`,
                                                transitionTimingFunction:
                                                    "cubic-bezier(0.4, 0, 0.2, 1)",
                                            }}
                                        >
                                            <ContextMenu>
                                                <ContextMenuTrigger>
                                                    <div className="grid grid-cols-[1fr_45px] items-center">
                                                        <div className="w-full max-w-full min-w-0">
                                                            <QueueSong
                                                                key={
                                                                    queueSong.index
                                                                }
                                                                song={queueSong}
                                                            />
                                                        </div>
                                                        <GripVertical
                                                            className="h-full w-full p-1 pr-3"
                                                            onMouseDown={(e) =>
                                                                mouseDown(
                                                                    e,
                                                                    queueSong,
                                                                    index
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent
                                                    cover={getImageUrl({
                                                        imageId:
                                                            queueSong.song
                                                                .image,
                                                    })}
                                                    title={queueSong.song.name}
                                                    description={`${queueSong.song.albumName} • ${queueSong.song.artists
                                                        .map((a) => a.name)
                                                        .join(", ")}`}
                                                >
                                                    <ContextMenuOption
                                                        onClick={() =>
                                                            handlePlaySong(
                                                                queueSong
                                                            )
                                                        }
                                                    >
                                                        <PlayCircle className="h-5 w-5" />
                                                        {$lang.play_song}
                                                    </ContextMenuOption>
                                                    <ContextMenuOption
                                                        onClick={() =>
                                                            handleRemoveSong(
                                                                queueSong
                                                            )
                                                        }
                                                        disable={
                                                            $queueIndex ==
                                                            queueSong.index
                                                        }
                                                    >
                                                        <ListX className="h-5 w-5" />
                                                        {
                                                            $lang.remove_from_queue
                                                        }
                                                    </ContextMenuOption>
                                                    <ContextMenuOption
                                                        onClick={() =>
                                                            saveSongToIndexedDB(
                                                                queueSong.song,
                                                                true
                                                            )
                                                        }
                                                    >
                                                        <HardDriveDownload className="h-5 w-5" />
                                                        {
                                                            $lang.download_song_to_device
                                                        }
                                                    </ContextMenuOption>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        </div>
                                    );
                                })}
                                <div>
                                    <div className="mt-5 h-[1px] w-full bg-neutral-400" />
                                    <h2 className="text-md my-2 px-4 font-semibold text-neutral-400">
                                        Reproducciones automáticas a
                                        continuación
                                    </h2>
                                    {[
                                        {
                                            id: "auto1",
                                            title: "Neon Nights",
                                            artist: "Synthwave Dreams",
                                        },
                                        {
                                            id: "auto2",
                                            title: "Midnight Ride",
                                            artist: "Retro Driver",
                                        },
                                        {
                                            id: "auto3",
                                            title: "Digital Sunset",
                                            artist: "Pixel Horizons",
                                        },
                                        {
                                            id: "auto4",
                                            title: "Electric Pulse",
                                            artist: "Voltage",
                                        },
                                        {
                                            id: "auto5",
                                            title: "Echoes in the Dark",
                                            artist: "Shadow Sound",
                                        },
                                    ].map((mock, i) => {
                                        if (!queueDivRef.current) return;

                                        const autoSong = {
                                            song: {
                                                id: mock.id,
                                                name: mock.title,
                                                albumName: "Unknown Album",
                                                artists: [
                                                    {
                                                        id: "unknown",
                                                        name: mock.artist,
                                                    },
                                                ],
                                                image: "/song-placeholder.png",
                                                duration: 0,
                                                albumId: "",
                                            },
                                            list: {
                                                type: "auto",
                                                id: "auto-list",
                                            },
                                            index: i,
                                        };

                                        return (
                                            <div
                                                key={`auto-${mock.id}`}
                                                className="relative w-full transition-[top] duration-200"
                                                style={{
                                                    transitionTimingFunction:
                                                        "cubic-bezier(0.4, 0, 0.2, 1)",
                                                }}
                                            >
                                                <ContextMenu>
                                                    <ContextMenuTrigger>
                                                        <div className="grid grid-cols-[1fr_45px] items-center">
                                                            <div className="w-full max-w-full min-w-0">
                                                                <QueueSong
                                                                    song={
                                                                        autoSong
                                                                    }
                                                                />
                                                            </div>
                                                            <ListPlus className="h-full w-full p-1 pr-4" />
                                                        </div>
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent
                                                        cover={getImageUrl({
                                                            imageId:
                                                                autoSong.song
                                                                    .image,
                                                        })}
                                                        title={
                                                            autoSong.song.name
                                                        }
                                                        description={`${autoSong.song.albumName} • ${autoSong.song.artists
                                                            .map((a) => a.name)
                                                            .join(", ")}`}
                                                    >
                                                        <ContextMenuOption
                                                            onClick={() =>
                                                                handlePlaySong(
                                                                    autoSong
                                                                )
                                                            }
                                                        >
                                                            <PlayCircle className="h-5 w-5" />
                                                            {$lang.play_song}
                                                        </ContextMenuOption>
                                                        <ContextMenuOption
                                                            onClick={() =>
                                                                handleRemoveSong(
                                                                    autoSong
                                                                )
                                                            }
                                                            disable={
                                                                $queueIndex ===
                                                                autoSong.index
                                                            }
                                                        >
                                                            <ListX className="h-5 w-5" />
                                                            {
                                                                $lang.remove_from_queue
                                                            }
                                                        </ContextMenuOption>
                                                        <ContextMenuOption
                                                            onClick={() =>
                                                                saveSongToIndexedDB(
                                                                    autoSong.song,
                                                                    true
                                                                )
                                                            }
                                                        >
                                                            <HardDriveDownload className="h-5 w-5" />
                                                            {
                                                                $lang.download_song_to_device
                                                            }
                                                        </ContextMenuOption>
                                                    </ContextMenuContent>
                                                </ContextMenu>
                                            </div>
                                        );
                                    })}
                                </div>
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
                                                    <Link
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
                                                    </Link>
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
                                    <Link
                                        href=""
                                        className="line-clamp-4 px-5 pt-2 text-justify"
                                    >
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
                                    </Link>
                                </section>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
