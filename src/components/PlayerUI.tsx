import { currentSong } from "@/stores/audio";
import { isPlayerUIVisible } from "@/stores/isPlayerUIVisible";
import { useStore } from "@nanostores/react";
import { useEffect, useRef, useState } from "react";


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
                    className={`truncate ${index === pastLyrics.length - 1
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
                    className={`truncate ${index === 0
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

    )
}

function DynamicLyrics() {
    const $currentSong = useStore(currentSong)

    const [lyricsIndex, setLyricsIndex] = useState(0)
    const [lyrics, setLyrics] = useState<string[] | string>()

    useEffect(() => {
        if (!$currentSong?.lyrics) { return }
        setLyrics($currentSong.lyrics.split("\n") || "")
    }, [$currentSong])

    useEffect(() => {
        if (!lyrics) { return }

        const handleKey = (event: KeyboardEvent) => {
            if (event.code == "ArrowRight") {
                setLyricsIndex(value => Math.min(value + 1, lyrics.length - 1))
            } else if (event.code == "ArrowLeft") {
                setLyricsIndex(value => Math.max(value - 1, 0))

            }
        }

        document.addEventListener("keyup", handleKey)

        return () => {
            document.removeEventListener("keyup", handleKey)
        }

    }, [lyrics])

    if (lyrics == "") {
        return <div>No lyrics found</div>
    }

    const commonSyles = "absolute px-4 text-center -translate-y-1/2 transition-all duration-500 text-balance"

    return (
        <div className="flex flex-col justify-center items-center px-4 overflow-hidden relative h-full">
            {lyrics?.map((line, index) => {
                switch (index - lyricsIndex) {
                    case -2:
                        return <div key={index} className={commonSyles} style={{ top: "35%", fontSize: "15px", fontWeight: 600, lineHeight: '28px', maxWidth: "60%", color: "rgb(200, 200, 200)" }}>{line}</div>
                    case -1:
                        return <div key={index} className={commonSyles} style={{ top: "40%", fontSize: "20px", fontWeight: 600, lineHeight: '32px', maxWidth: "80%", color: "rgb(200, 200, 200)" }}>{line}</div>
                    case 0:
                        return <div key={index} className={commonSyles} style={{ top: "50%", fontSize: "25px", fontWeight: 600, lineHeight: '40px', maxWidth: "100%" }}>{line}</div>
                    case 1:
                        return <div key={index} className={commonSyles} style={{ top: "60%", fontSize: "20px", fontWeight: 600, lineHeight: '32px', maxWidth: "80%", color: "rgb(200, 200, 200)" }}>{line}</div>
                    case 2:
                        return <div key={index} className={commonSyles} style={{ top: "65%", fontSize: "15px", fontWeight: 600, lineHeight: '28px', maxWidth: "60%", color: "rgb(200, 200, 200)" }}>{line}</div>
                }

                if (index - lyricsIndex > 0) {
                    return <div key={index} className={commonSyles} style={{ top: "67%", fontSize: "0", fontWeight: 600, lineHeight: '28px', maxWidth: "10%", color: "rgb(200, 200, 200)" }}>{line}</div>
                } else {
                    return <div key={index} className={commonSyles} style={{ top: "33%", fontSize: "0", fontWeight: 600, lineHeight: '28px', maxWidth: "10%", color: "rgb(200, 200, 200)" }}>{line}</div>

                }
            })}
        </div>
    )
}

export default function PlayerUI() {
    const $currentSong = useStore(currentSong)

    const [currentTab, setCurrentTab] = useState("queue");

    // Mockup de canciones en la cola
    const mockQueue = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        title: `Canción ${i + 1}` || "Canción desconocida",
        artist: `Artista ${i + 1}` || "Artista desconocido",
        cover: "/song-placeholder.png",
        duration: "0:00",
    }));

    const $isPlayerUIVisible = useStore(isPlayerUIVisible)



    return (
        <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center transition-all overflow-hidden duration-200"
            // style={{ display: $isPlayerUIVisible ? 'flex' : 'none' }}
            style={{ transform: $isPlayerUIVisible ? 'translateY(0%)' : 'translateY(-100%)' }}
        > {/* Invert flex and none */}

            <div
                className="relative w-full h-full bg-black text-white"
                style={{
                    backgroundImage: `url(${$currentSong?.images[0]?.url || "/song-placeholder.png"})`,
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
                                src={$currentSong?.images[0]?.url || "/song-placeholder.png"}
                                alt="Song Cover"
                                className="object-cover min-w-0 min-h-0 mx-auto max-h-full w-full max-w-[500px]  rounded-lg aspect-square"
                            />
                            <div className="text-center">
                                <h1 className="text-3xl font-bold">{$currentSong?.name}</h1>
                                <p className="text-gray-400 text-lg mt-2 font-medium">{$currentSong?.albumName} · Release date</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Queue */}
                    <div className="overflow-hidden px-4 flex flex-col h-full">
                        {/* Selector */}
                        <div className="flex space-x-4 mb-4">
                            <button
                                className={`px-4 py-2 rounded ${currentTab === "queue"
                                    ? "bg-gray-700 text-white"
                                    : "bg-gray-300 text-gray-700"
                                    }`}
                                onClick={() => setCurrentTab("queue")}
                            >
                                Cola
                            </button>
                            <button
                                className={`px-4 py-2 rounded ${currentTab === "recommended"
                                    ? "bg-gray-700 text-white"
                                    : "bg-gray-300 text-gray-700"
                                    }`}
                                onClick={() => setCurrentTab("recommended")}
                            >
                                Recomendados
                            </button>
                        </div>

                        {/* Contenido dinámico */}
                        <div className="flex-1 overflow-auto bg-gray-800 rounded p-4">
                            {currentTab === "queue" ? (
                                <ul className="space-y-4">
                                    {mockQueue.map((song) => (
                                        <li key={song.id} className="flex items-center">
                                            {/* Cover */}
                                            <img
                                                src={song.cover}
                                                alt={song.title}
                                                className="w-12 h-12 rounded mr-4"
                                            />
                                            {/* Song Info */}
                                            <div className="flex-1">
                                                <p className="text-white font-bold truncate">{song.title}</p>
                                                <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                                            </div>
                                            {/* Duration */}
                                            <p className="text-gray-300">{song.duration}</p>
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
    )
}