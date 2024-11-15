import { currentSong } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import {
    Shuffle,
    SkipBack,
    SkipForward,
    CirclePlay,
    Repeat,
} from "lucide-react";



export default function FooterCenter() {
    const $currentSong = useStore(currentSong)

    console.log($currentSong)

    return (
        <div className="flex items-center w-1/3 space-x-3">
            <img
                id="footer-album-cover"
                src={($currentSong?.images && $currentSong?.images[0]?.url) || "/song-placeholder.png"}
                alt="Album Cover"
                className="w-16 h-16 rounded-md"
            />
            <div className="flex flex-col">
                <span id="footer-song-title" className="font-semibold">{$currentSong?.name || "Canción desconocida :("}</span>
                <span id="footer-song-artist" className="text-sm text-gray-400">
                    <a href="/artist-url" className="hover:underline">{$currentSong?.artists?.map(artist => artist.name) || "Artista desconocido"}</a>
                    <span className="mx-1">·</span>
                    <a href="/album-url" className="hover:underline">Álbum Desconocido</a>
                </span> 
            </div>
        </div>
    )
}