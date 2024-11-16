import { currentSong } from "@/stores/audio";
import { isPlayerUIVisible } from "@/stores/isPlayerUIVisible";
import { useStore } from "@nanostores/react";

export default function PlayerUI() {
    const $currentSong = useStore(currentSong)

    const $isPlayerUIVisible = useStore(isPlayerUIVisible)

    const currentLyric = "This is the current lyric"; // Lírica actual (puede ser dinámica)
    const pastLyrics = ["Previous lyric line 1", "Previous lyric line 2"]; // Líricas anteriores
    const futureLyrics = ["Next lyric line 1", "Next lyric line 2"]; // Líricas futuras

    return (
        <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center transition-all overflow-hidden"
            // style={{ display: $isPlayerUIVisible ? 'flex' : 'none' }}
            style={{ maxHeight: $isPlayerUIVisible ? '2000px' : '0px' }}
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
                    <div className="overflow-hidden px-4">
                        <slot />
                    </div>
                </div>
            </div>
        </div>
    )
}