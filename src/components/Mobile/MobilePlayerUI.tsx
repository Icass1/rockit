import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat } from "lucide-react";

export default function MobilePlayerUI() {
    return (
        <div className="relative w-screen h-screen overflow-hidden md:hidden z-40">
            {/* Fondo blurreado */}
            <div
                className="absolute inset-0 bg-center bg-cover"
                style={{
                    backgroundImage: "url('/song-placeholder.png')",
                    filter: "blur(20px) brightness(0.35)",
                }}
            ></div>

            {/* Contenido principal */}
            <div className="relative z-30 flex flex-col items-center justify-center h-full text-white px-4">
                {/* Imagen de la canción */}
                <div className="mb-6 w-[90%] aspect-square bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <img
                        src="/song-placeholder.png"
                        alt="Current song artwork"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Controles */}
                <div className="flex items-center gap-3">
                    <button className="w-12 h-12 flex items-center justify-center">
                        <Shuffle className="w-6 h-6" />
                    </button>

                    <button className="w-12 h-12 flex items-center justify-center">
                        <SkipBack className="w-8 h-8 fill-current" />
                    </button>

                    <button className="w-16 h-16 flex items-center bg-white justify-center rounded-full p-3">
                        <Play className="w-14 h-14 stroke-black fill-none" />
                    </button>


                    <button className="w-12 h-12 flex items-center justify-center">
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