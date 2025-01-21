import { useStore } from "@nanostores/react";
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle } from "lucide-react";
import { getTime } from "@/lib/getTime";
import {
    currentSong,
    currentTime,
    next,
    pause,
    play,
    playing,
    prev,
    randomQueue,
    setTime,
    type CurrentSong,
} from "@/stores/audio";

export default function MusicPlayer() {
    const $playing = useStore(playing);
    const $currentTime = useStore(currentTime);
    const $currentSong = useStore(currentSong) as CurrentSong | null;
    const $randomQueue = useStore(randomQueue);

    return (
        <div className="relative w-screen h-screen overflow-hidden md:hidden z-40">
            {/* Fondo blurreado */}
            <div
                className="absolute inset-0 bg-center bg-cover"
                style={{
                    backgroundImage: `url(${$currentSong?.image ? `/api/image/${$currentSong.image}` : `/song-placeholder.png`})`,
                    filter: "blur(20px) brightness(0.5)",
                }}
            ></div>

            {/* Contenido principal */}
            <div className="relative z-30 flex flex-col items-center justify-center h-full text-white px-4">
                {/* Imagen de la canción */}
                <div className="mb-6 w-full aspect-square bg-gray-900 rounded-md shadow-md overflow-hidden">
                    <img
                        src={
                            $currentSong?.image
                                ? `/api/image/${$currentSong.image}`
                                : "/song-placeholder.png"
                        }
                        alt="Current song artwork"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Slider de duración */}
                <div className="w-full max-w-md px-4">
                    <input
                        type="range"
                        min="0"
                        max={$currentSong?.duration || 1}
                        value={$currentTime || 0}
                        onChange={(e) => setTime(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-sm text-gray-300 mt-1">
                        <span>{getTime($currentTime || 0)}</span>
                        <span>{getTime($currentSong?.duration || 0)}</span>
                    </div>
                </div>

                {/* Controles */}
                <div className="flex items-center gap-3">

                    <button 
                        className="w-12 h-12 flex items-center justify-center"
                        onClick={() => randomQueue.set(!randomQueue.get())}
                    >
                        <Shuffle className={"w-6 h-6 " + ($randomQueue ? " text-[#ee1086] " : " text-white ")} />
                    </button>


                    <button 
                        className="w-12 h-12 flex items-center justify-center"
                        onClick={async () => {
                            await prev();
                            play();
                        }}
                    >
                        <SkipBack className="w-8 h-8 fill-current" />
                    </button>

                    <button
                        className="w-16 h-16 flex items-center justify-center rounded-full"
                    >
                        {$playing ? (
                            <Pause 
                                className="w-14 h-14 fill-current"
                                onClick={pause}
                            />
                        ) : (
                            <Play 
                                className="w-14 h-14 fill-current" 
                                onClick={play}
                            />
                        )}
                    </button>

                    <button 
                        className="w-12 h-12 flex items-center justify-center"
                        onClick={async () => {
                            await next();
                            play();
                        }}
                    >
                        <SkipForward className="w-8 h-8 fill-current" />
                    </button>

                    <button className="w-12 h-12 flex items-center justify-center">
                        <Repeat className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
