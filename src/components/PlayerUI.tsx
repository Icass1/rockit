import type { SongDB } from "@/db/song";
import {
    currentSong,
    currentTime,
    queue,
    queueIndex,
    type QueueElement,
    type QueueSong,
} from "@/stores/audio";
import { isPlayerUIVisible } from "@/stores/isPlayerUIVisible";
import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState } from "react";
import { EllipsisVertical, Play } from "lucide-react";
import { getTime } from "@/lib/getTime";

const lyricsTimeStamp = {
    "3jnoftwNCmIuTNVkxakisg": [
        { time: 0, index: -1 },
        { time: 3.616696, index: 0 },
        // { time: 8.950831, index: 1 },
        { time: 9.215222, index: 2 },
        { time: 14.526888, index: 3 },
        { time: 19.325092, index: 4 },
        { time: 25.185074, index: 5 },
        { time: 29.956093, index: 6 },
        { time: 35.822759, index: 7 },
        { time: 41.933646, index: 8 },
        { time: 45.124741, index: 9 },
        // { time: 47.509194, index: 10 },
        { time: 47.509194, index: 11 },
        { time: 50.695647, index: 12 },
        { time: 55.217082, index: 13 },
        { time: 61.316389, index: 14 },
        { time: 66.366691, index: 15 },
        { time: 71.945134, index: 16 },
        { time: 78.338074, index: 17 },
        { time: 81.540765, index: 18 },
        // { time: 83.660661, index: 19 },
        { time: 83.923712, index: 20 },
        { time: 87.139223, index: 21 },
        { time: 91.656725, index: 22 },
        { time: 98.039327, index: 23 },
        { time: 102.576683, index: 24 },
        { time: 106.552604, index: 25 },
        { time: 111.614134, index: 26 },
        { time: 117.469267, index: 27 },
        { time: 123.325435, index: 28 },
        { time: 128.892991, index: 29 },
        { time: 129.159588, index: 30 },
        { time: 135.81524, index: 31 },
        { time: 137.153702, index: 32 },
        // { time: 141.154856, index: 33 },
        { time: 141.421138, index: 34 },
        { time: 144.35482, index: 35 },
        { time: 149.405762, index: 36 },
        { time: 155.248614, index: 37 },
        { time: 160.018923, index: 38 },
        { time: 165.865251, index: 39 },
        { time: 171.726646, index: 40 },
        { time: 175.445873, index: 41 },
        // { time: 177.831607, index: 42 },
        { time: 177.831607, index: 43 },
        { time: 181.566975, index: 44 },
        { time: 186.092668, index: 45 },
        { time: 191.953785, index: 46 },
        { time: 196.467401, index: 47 },
        { time: 200.977231, index: 48 },
        { time: 204.963814, index: 49 },
        { time: 211.339704, index: 50 },
        { time: 217.469934, index: 51 },
    ].reverse(),
};

function DynamicLyrics() {
    const $currentSong = useStore(currentSong);
    const $currentTime = useStore(currentTime);

    const [lyricsIndex, setLyricsIndex] = useState(0);
    const [lyrics, setLyrics] = useState<string[] | string>();

    useEffect(() => {
        if (!$currentSong?.id) {
            return;
        }

        fetch(`/api/song/${$currentSong?.id}?q=lyrics`)
            .then((response) => response.json())
            .then((data: SongDB<"lyrics">) => {
                if (!data.lyrics) {
                    return;
                }
                setLyrics(data.lyrics.split("\n") || "");
            });
    }, [$currentSong]);

    useEffect(() => {
        if (!lyrics) {
            return;
        }

        const handleKey = (event: KeyboardEvent) => {
            if (event.code == "ArrowRight") {
                setLyricsIndex((value) =>
                    Math.min(value + 1, lyrics.length - 1)
                );
                console.log(currentTime.get(), lyricsIndex);
            } else if (event.code == "ArrowLeft") {
                setLyricsIndex((value) => Math.max(value - 1, 0));
            }
        };

        document.addEventListener("keyup", handleKey);

        return () => {
            document.removeEventListener("keyup", handleKey);
        };
    }, [lyrics, lyricsIndex]);

    useEffect(() => {
        if (!$currentSong || !$currentTime) {
            return;
        }

        const timeStamps = Object.entries(lyricsTimeStamp).find((a) => {
            return a[0] == $currentSong.id;
        })?.[1];
        if (!timeStamps) {
            return;
        }

        const index = timeStamps.find(
            (timeStamp) => timeStamp.time < $currentTime
        )?.index;
        if (typeof index != "number") {
            return;
        }

        setLyricsIndex(index + 1);
    }, [$currentTime, $currentSong]);

    if (typeof lyrics == "string" || typeof lyrics == "undefined") {
        return (
            <div className="flex flex-col justify-center items-center px-4 overflow-hidden relative h-full min-w-[31.5%]">
                No lyrics found
            </div>
        );
    }

    const commonSyles =
        "absolute pl-16 pr-4 text-center -translate-y-1/2 transition-all duration-500 text-balance";

    return (
        <div className="flex flex-col justify-center items-center px-4 overflow-hidden relative h-full min-w-[31.5%]">
            {lyrics.map((line, index) => {
                switch (index - lyricsIndex) {
                    case -2:
                        return (
                            <div
                                key={index}
                                className={commonSyles}
                                style={{
                                    top: "25%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                    scale: "0.4",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case -1:
                        return (
                            <div
                                key={index}
                                className={commonSyles}
                                style={{
                                    top: "35%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                    scale: "0.6",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case 0:
                        return (
                            <div
                                key={index}
                                className={commonSyles}
                                style={{
                                    top: "50%",
                                    fontSize: "4vh",
                                    fontWeight: 600,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case 1:
                        return (
                            <div
                                key={index}
                                className={commonSyles}
                                style={{
                                    top: "63%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                    scale: "0.6",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case 2:
                        return (
                            <div
                                key={index}
                                className={commonSyles}
                                style={{
                                    top: "75%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                    scale: "0.4",
                                }}
                            >
                                {line}
                            </div>
                        );
                }

                if (index - lyricsIndex > 0) {
                    return (
                        <div
                            key={index}
                            className={commonSyles}
                            style={{
                                top: "75%",
                                fontSize: "4vh",
                                fontWeight: 500,
                                lineHeight: "4vh",
                                maxWidth: "100%",
                                color: "rgb(200, 200, 200)",
                                scale: 0,
                            }}
                        >
                            {line}
                        </div>
                    );
                } else {
                    return (
                        <div
                            key={index}
                            className={commonSyles}
                            style={{
                                top: "25%",
                                fontSize: "4vh",
                                fontWeight: 500,
                                lineHeight: "4vh",
                                maxWidth: "100%",
                                color: "rgb(200, 200, 200)",
                                scale: 0,
                            }}
                        >
                            {line}
                        </div>
                    );
                }
            })}
        </div>
    );
}

function QueueSong({ song }: { song: QueueElement }) {
    const $queueIndex = useStore(queueIndex);
    return (
        <li
            className={`flex items-center gap-x-2 p-2 group ${
                song.index === $queueIndex
                    ? "bg-[rgba(50,50,50,0.75)]"
                    : "md:hover:bg-[rgba(75,75,75,0.75)]"
            }`}
        >
            {/* Espacio para el ícono */}
            <div className="h-10 flex items-center justify-center">
                <div className={`opacity-0 group-hover:opacity-100`}>
                    <EllipsisVertical className="text-white w-5 h-12 md:hover:cursor-move" />
                </div>
            </div>
            {/* Cover */}
            <div className="relative">
                {/* Imagen de portada */}
                <img
                    src={
                        song.song.image
                            ? `/api/image/${song.song.image}`
                            : "/song-placeholder.png"
                    }
                    alt={song.song.name}
                    className={`w-12 h-12 rounded object-cover ${
                        song.index === $queueIndex ? "brightness-50" : ""
                    }`}
                />
                {/* Ícono Play */}
                {song.index === $queueIndex && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="text-white w-5 h-5 fill-current" />
                    </div>
                )}
            </div>
            {/* Song Info */}
            <div className="flex-1 min-w-0 max-w-full">
                <p className="text-white text-base font-semibold truncate">
                    <label className="text-xs text-yellow-400">
                        {song.index} -{" "}
                    </label>
                    {song.song.name}
                </p>
                <p className="text-gray-300 text-sm truncate">
                    {song.song.artists.map((artist) => artist.name).join(", ")}
                </p>
            </div>
            {/* Duration */}
            <p className="text-gray-300 text-base px-2">
                {getTime(song.song.duration)}
            </p>
        </li>
    );
}

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

    useEffect(() => {
        if (!divRef.current) {
            return;
        }
        const handleDocumentClick = (event: MouseEvent) => {
            if (
                !divRef.current?.contains(event?.target as Node) &&
                !document
                    .querySelector("#toggle-player-ui")
                    ?.contains(event?.target as Node) &&
                !document
                    .querySelector("#footer-center")
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

    return (
        <div
            ref={divRef}
            className="absolute inset-0 bg-black/80 flex justify-center items-center transition-all overflow-hidden duration-300 z-30 pt-20"
            style={{
                top: $isPlayerUIVisible ? "0%" : "100%",
                height: "calc(100% - 6rem)",
            }}
        >
            <div className="relative w-full  bg-black text-white grid grid-cols-[30%_40%_30%] h-full z-20">
                <img
                    src={
                        $currentSong?.image
                            ? `/api/image/${$currentSong?.image}`
                            : "/song-placeholder.png"
                    }
                    className="absolute w-full h-auto top-1/2 -translate-y-1/2 blur-md brightness-50"
                ></img>

                <div className="z-40 w-full h-full">
                    <h2 className="absolute w-[31.5%] text-center text-3xl font-bold mx-auto p-14 underline">
                        Lyrics
                    </h2>
                    <DynamicLyrics />
                </div>

                {/* Middle Column: Cover & Info */}
                <div className="min-w-0 min-h-0 max-w-full max-h-full flex flex-col items-center justify-center z-40">
                    <div className="max-h-[70%] aspect-square">
                        <img
                            src={
                                $currentSong?.image
                                    ? `/api/image/${$currentSong?.image}`
                                    : "/song-placeholder.png"
                            }
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
                        className="flex-1 overflow-auto pt-3 pb-7 relative"
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

                                        const top = index * 64;

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
                                                onMouseDown={() => {
                                                    setDraggingSong(queueSong);
                                                }}
                                                className="absolute w-full"
                                                style={{
                                                    top: `${top}px`,
                                                }}
                                            >
                                                {draggingSong &&
                                                    spacerIndex == -1 &&
                                                    index == 0 && (
                                                        <div className="h-16 bg-gradient-to-r from-[#ee108650] to-[#fb646750]"></div>
                                                    )}
                                                <QueueSong song={queueSong} />
                                                {draggingSong &&
                                                    typeof spacerIndex !=
                                                        "undefined" &&
                                                    spacerIndex == index && (
                                                        <div className="h-16 bg-gradient-to-r from-[#ee108650] to-[#fb646750]"></div>
                                                    )}
                                            </div>
                                        );
                                    })}

                                {draggingSong && queueDivRef.current && (
                                    <div
                                        className="fixed"
                                        style={{
                                            top: `${draggingPos[1]}px`,
                                            left: `${draggingPos[0]}px`,
                                        }}
                                    >
                                        <QueueSong song={draggingSong} />
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
