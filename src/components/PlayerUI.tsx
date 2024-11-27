import type { SongDB } from "@/lib/db";
import {
    currentSong,
    currentTime,
    queue,
    queueIndex,
} from "@/stores/audio";
import { isPlayerUIVisible } from "@/stores/isPlayerUIVisible";
import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import { EllipsisVertical, Play } from "lucide-react";
import { getTime } from "@/lib/getTime";

function MockupLyrics() {
    const currentLyric = "This is the current lyric"; // Lírica actual (puede ser dinámica)
    const pastLyrics = ["Previous lyric line 1", "Previous lyric line 2"]; // Líricas anteriores
    const futureLyrics = ["Next lyric line 1", "Next lyric line 2"]; // Líricas futuras
    return (
        <div className="flex flex-col justify-center items-center px-4 space-y-6 overflow-hidden relative h-full">
            {/* Espaciador flexible para equilibrar */}
            <div className="flex-grow"></div>

            {pastLyrics.map((lyric, index) => (
                <p
                    className={`truncate ${
                        index === pastLyrics.length - 1
                            ? "text-gray-300 text-2xl text-center" // Última línea pasada: más grande.
                            : "text-gray-400 text-lg text-center" // Otras pasadas.
                    }`}
                >
                    {lyric}
                </p>
            ))}

            {/* Línea actual */}
            <p className="text-white text-5xl font-extrabold mt-4 mb-4 text-center">
                {currentLyric}
            </p>

            {futureLyrics.map((lyric, index) => (
                <p
                    className={`truncate ${
                        index === 0
                            ? "text-gray-300 text-2xl text-center" // Primera línea futura: más grande.
                            : "text-gray-400 text-lg text-center" // Otras futuras.
                    }`}
                >
                    {lyric}
                </p>
            ))}
            {/* Espaciador flexible para equilibrar*/}
            <div className="flex-grow"></div>
        </div>
    );
}

const lyricsTimeStamp = {
    "3jnoftwNCmIuTNVkxakisg": [
        { time: 0, index: -1 },
        { time: 3.616696, index: 0 },
        { time: 8.950831, index: 1 },
        { time: 9.215222, index: 2 },
        { time: 14.526888, index: 3 },
        { time: 19.325092, index: 4 },
        { time: 25.185074, index: 5 },
        { time: 29.956093, index: 6 },
        { time: 35.822759, index: 7 },
        { time: 41.933646, index: 8 },
        { time: 45.124741, index: 9 },
        { time: 47.509194, index: 10 },
        { time: 47.509194, index: 11 },
        { time: 50.695647, index: 12 },
        { time: 55.217082, index: 13 },
        { time: 61.316389, index: 14 },
        { time: 66.366691, index: 15 },
        { time: 71.945134, index: 16 },
        { time: 78.338074, index: 17 },
        { time: 81.540765, index: 18 },
        { time: 83.660661, index: 19 },
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
        { time: 223.313882, index: 52 },
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
        return <div>No lyrics found</div>;
    }

    const commonSyles =
        "absolute px-4 text-center -translate-y-1/2 transition-all duration-500 text-balance";

    return (
        <div className="flex flex-col justify-center items-center px-4 overflow-hidden relative h-full">
            {lyrics.map((line, index) => {
                switch (index - lyricsIndex) {
                    case -2:
                        return (
                            <div
                                key={index}
                                className={commonSyles}
                                style={{
                                    top: "30%",
                                    fontSize: "15px",
                                    fontWeight: 600,
                                    lineHeight: "28px",
                                    maxWidth: "60%",
                                    color: "rgb(200, 200, 200)",
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
                                    top: "40%",
                                    fontSize: "20px",
                                    fontWeight: 600,
                                    lineHeight: "32px",
                                    maxWidth: "80%",
                                    color: "rgb(200, 200, 200)",
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
                                    fontSize: "25px",
                                    fontWeight: 600,
                                    lineHeight: "40px",
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
                                    top: "60%",
                                    fontSize: "20px",
                                    fontWeight: 600,
                                    lineHeight: "32px",
                                    maxWidth: "80%",
                                    color: "rgb(200, 200, 200)",
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
                                    top: "70%",
                                    fontSize: "15px",
                                    fontWeight: 600,
                                    lineHeight: "28px",
                                    maxWidth: "60%",
                                    color: "rgb(200, 200, 200)",
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
                                top: "67%",
                                fontSize: "0",
                                fontWeight: 600,
                                lineHeight: "28px",
                                maxWidth: "10%",
                                color: "rgb(200, 200, 200)",
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
                                top: "33%",
                                fontSize: "0",
                                fontWeight: 600,
                                lineHeight: "28px",
                                maxWidth: "10%",
                                color: "rgb(200, 200, 200)",
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

export default function PlayerUI() {
    const $currentSong = useStore(currentSong);

    const [currentTab, setCurrentTab] = useState("queue");

    const $isPlayerUIVisible = useStore(isPlayerUIVisible);
    const $queue = useStore(queue);
    const $queueIndex = useStore(queueIndex);

    return (
        <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center transition-all overflow-hidden duration-200"
            // style={{ display: $isPlayerUIVisible ? 'flex' : 'none' }}
            style={{
                transform: $isPlayerUIVisible
                    ? "translateY(0%)"
                    : "translateY(-100%)",
            }}
        >
            {" "}
            {/* Invert flex and none */}
            <div
                className="relative w-full h-full bg-black text-white"
                style={{
                    backgroundImage: `url(${
                        $currentSong?.images[0]?.url || "/song-placeholder.png"
                    })`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                {/* Background Blur Overlay */}
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md"></div>

                {/* Grid Content */}
                <div className="relative z-10 grid grid-cols-[30%_40%_30%] h-full">
                    {/* Left Column: Lyrics */}

                    <DynamicLyrics />

                    {/* Middle Column: Cover & Info */}
                    <div className="min-w-0 min-h-0 max-w-full relative max-h-full">
                        <div className="h-fit min-w-0 min-h-0 max-w-full top-1/2 relative -translate-y-1/2">
                            <img
                                src={
                                    $currentSong?.images[0]?.url ||
                                    "/song-placeholder.png"
                                }
                                alt="Song Cover"
                                className="object-cover min-w-0 min-h-0 mx-auto max-h-full w-full max-w-[500px]  rounded-lg aspect-square"
                            />
                            <div className="text-center">
                                <h1 className="text-3xl font-bold">
                                    {$currentSong?.name}
                                </h1>
                                <p className="text-gray-400 text-lg mt-2 font-medium">
                                    {$currentSong?.albumName} · No release date
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Queue */}
                    <div className="overflow-hidden flex flex-col h-full bg-gradient-to-r from-[rgba(0,0,0,0.5)] to-black">
                        {/* Selector */}
                        <div className="flex justify-center items-center gap-10 pt-6 pb-4 relative border-b border-gray-600">
                        <button
                            className={`text-lg font-semibold transition ${
                            currentTab === "queue"
                                ? "text-white border-b-2 border-white"
                                : "text-gray-400 hover:text-white"
                            }`}
                            onClick={() => setCurrentTab("queue")}
                        >
                            Queue
                        </button>
                        <button
                            className={`text-lg font-semibold transition ${
                            currentTab === "recommended"
                                ? "text-white border-b-2 border-white"
                                : "text-gray-400 hover:text-white"
                            }`}
                            onClick={() => setCurrentTab("recommended")}
                        >
                            Related
                        </button>
                        </div>
                        {/* Contenido dinámico */}
                        <div className="flex-1 overflow-auto py-3">
                            {currentTab === "queue" ? (
                            <ul className="flex flex-col">
                                {$queue.map((song, index) => (
                                <li
                                    key={song.id}
                                    className={`flex items-center gap-x-2 p-2 group ${
                                    index === $queueIndex ? "bg-[#272727]" : "hover:bg-[#494949]"
                                    }`}
                                >
                                    {/* Espacio para el ícono */}
                                    <div className="h-10 flex items-center justify-center">
                                        <div
                                            className={`opacity-0 group-hover:opacity-100`}
                                        >
                                            <EllipsisVertical className="text-white w-5 h-12 hover:cursor-move" />
                                        </div>
                                    </div>
                                    {/* Cover */}
                                    {/* Cover */}
                                    <div className="relative">
                                        {/* Imagen de portada */}
                                        <img
                                            src={song.images[0].url}
                                            alt={song.name}
                                            className={`w-12 h-12 rounded object-cover ${
                                                index === $queueIndex ? "brightness-50" : ""
                                            }`}
                                        />
                                        {/* Ícono Play */}
                                        {index === $queueIndex && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Play className="text-white w-5 h-5 fill-current" />
                                        </div>
                                        )}
                                    </div>
                                    {/* Song Info */}
                                    <div className="flex-1 min-w-0 max-w-full">
                                        <p className="text-white text-base font-semibold truncate">
                                            {song.name}
                                        </p>
                                        <p className="text-gray-400 text-sm truncate">
                                            {song.artists.map((artist) => artist.name).join(", ")}
                                        </p>
                                    </div>
                                    {/* Duration */}
                                    <p className="text-gray-300 text-base pr-2">{getTime(song.duration)}</p>
                                </li>
                                ))}
                            </ul>
                            ) : (
                            <slot />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
