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

            let tempDraggingSong = prevSongs.find(
                (song) => song.song.id == draggingSong.song.id
            );
            if (typeof tempDraggingSong == "undefined") return;
            if (typeof spacerIndex == "undefined") return;

            let draggingSongIndex = prevSongs.indexOf(tempDraggingSong);

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
            .findIndex((_song) => _song.index == queueIndex.get());

        if (queueDivRef.current) {
            queueDivRef.current.scrollTop = index * 64;
        }
    }, [$isPlayerUIVisible, queueDivRef]);

    if (innerWidth < 768) return;

    return (
        <div
            ref={divRef}
            className="absolute inset-0 bg-black/80 flex justify-center pl-12 items-center transition-all overflow-hidden duration-300 z-30 pt-20"
            style={{
                top: $isPlayerUIVisible ? "0%" : "100%",
                height: "calc(100% - 6rem)",
            }}
        >
            <div className="relative w-full bg-black text-white grid grid-cols-[1fr_1fr] lg:grid-cols-[30%_40%_30%] gap-x-2 px-2 h-full z-20">
                <img
                    src={getImageUrl({
                        imageId: $currentSong?.image,
                        width: 200,
                        height: 200,
                        placeHolder: "/song-placeholder.png",
                    })}
                    className="absolute w-full h-auto top-1/2 -translate-y-1/2 blur-md brightness-50"
                ></img>

                <div className="z-40 w-full h-full hidden lg:block">
                    <h2 className="absolute w-[31.5%] text-center text-3xl font-bold mx-auto p-14">
                        Lyrics
                    </h2>
                    <DynamicLyrics />
                </div>

                {/* Middle Column: Cover & Info */}
                <div className="min-w-0 w-full min-h-0 max-w-full max-h-full flex flex-col items-center justify-center z-40">
                    <div className="max-h-[70%] aspect-square">
                        <img
                            src={getImageUrl({
                                imageId: $currentSong?.image,
                                placeHolder: "/song-placeholder.png",
                            })}
                            alt="Song Cover"
                            className="object-cover mx-auto w-auto h-[100%] rounded-lg aspect-square"
                        />
                    </div>
                    <div className="w-full flex flex-col items-center justify-center text-center mt-2 px-2">
                        <h1 className="text-4xl font-bold text-balance line-clamp-2 leading-normal">
                            {$currentSong?.name}
                        </h1>
                        <p className="text-gray-400 w-full text-xl mt-2 font-medium flex items-center justify-center gap-1">
                            <span className="max-w-[75%] md:hover:underline truncate text-center">
                                {$currentSong?.albumName}
                            </span>
                            <span>•</span>
                            {$currentSong?.artists &&
                            $currentSong.artists.length > 0 ? (
                                <a
                                    href={`/artist/${$currentSong.artists[0].id}`}
                                    className="md:hover:underline truncate"
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
                <div className="overflow-hidden flex flex-col h-full bg-gradient-to-r z-10 from-[rgba(0,0,0,0)] to-[rgba(0,0,0,0.5)] select-none">
                    {/* Selector */}
                    <div className="flex justify-center items-center gap-10 pt-6 pb-4 relative border-b border-white">
                        <button
                            className={`text-lg font-semibold transition ${
                                currentTab === "queue"
                                    ? "text-white border-b-2 border-white"
                                    : "text-gray-400 md:hover:text-white"
                            }`}
                            onClick={() => setCurrentTab("queue")}
                        >
                            Queue
                        </button>
                        <button
                            className={`text-lg font-semibold transition ${
                                currentTab === "recommended"
                                    ? "text-white border-b-2 border-white"
                                    : "text-gray-400 md:hover:text-white"
                            }`}
                            onClick={() => setCurrentTab("recommended")}
                        >
                            Related
                        </button>
                    </div>
                    {/* Contenido dinámico */}
                    <div
                        className="flex-1 overflow-auto pt-3 pb-7 relative scroll-smooth"
                        ref={queueDivRef}
                        onScroll={(e) =>
                            setQueueScroll(e.currentTarget.scrollTop)
                        }
                    >
                        {currentTab === "queue" ? (
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
                                            top: `${draggingPos[1] + queueScroll - queueDivRef.current.getBoundingClientRect().y}px`,
                                            // left: `${draggingPos[0]}px`,
                                        }}
                                    >
                                        <QueueSong song={draggingSong} dragging/>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <section>
                                    <h2 className="text-2xl font-bold text-left">
                                        Similar Songs
                                    </h2>
                                    <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-2 py-2 md:[scrollbar-gutter:stable]">
                                        {/* Aquí creamos las columnas */}
                                        {columns.map((_, columnIndex) => (
                                            <div
                                                key={columnIndex}
                                                className="flex flex-col gap-1 flex-none w-[calc(50%-10px)] max-w-[300px] snap-center"
                                            >
                                                {Array.from({
                                                    length: songsPerColumn,
                                                }).map((_, songIndex) => (
                                                    <a
                                                        href="#"
                                                        key={songIndex}
                                                        className="flex items-center gap-2 rounded-lg p-2 hover:bg-zinc-800 transition h-fit"
                                                    >
                                                        {/* Imagen de la canción */}
                                                        <img
                                                            className="rounded-sm w-12 h-12 object-cover"
                                                            src="/song-placeholder.png"
                                                            alt={`Song ${
                                                                columnIndex *
                                                                    songsPerColumn +
                                                                songIndex +
                                                                1
                                                            }`}
                                                        />

                                                        {/* Información de la canción */}
                                                        <div className="flex flex-col justify-center min-w-0">
                                                            {/* Nombre de la canción */}
                                                            <span className="text-md font-semibold text-white truncate">
                                                                Song{" "}
                                                                {columnIndex *
                                                                    songsPerColumn +
                                                                    songIndex +
                                                                    1}
                                                            </span>

                                                            {/* Artista y álbum */}
                                                            <span className="text-sm text-gray-400 truncate">
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
                                    <h2 className="text-2xl font-bold text-left pt-7">
                                        Artists you may like
                                    </h2>
                                    <div className="flex gap-7 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-4 px-2">
                                        {/* Aquí creamos las columnas de artistas */}
                                        {columns.map((_, artistIndex) => (
                                            <div
                                                key={artistIndex}
                                                className="flex flex-col items-center gap-2 flex-none snap-center"
                                            >
                                                {/* Imagen del artista */}
                                                <img
                                                    className="rounded-full w-28 h-28 object-cover"
                                                    src="/user-placeholder.png"
                                                    alt={`Artist ${
                                                        artistIndex + 1
                                                    }`}
                                                />
                                                {/* Nombre del artista */}
                                                <span className="text-md font-semibold text-white text-center truncate">
                                                    Artist {artistIndex + 1}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h2 className="text-2xl font-bold text-left pt-7">
                                        Song / Artist Description
                                    </h2>
                                    <a className="pt-2 px-5 text-justify line-clamp-4">
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
