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
                <span id="footer-song-title" className="font-semibold">{$currentSong?.name || "Escoge una canción"}</span>
                <span id="footer-song-artist" className="text-sm text-gray-400 hover:underline cursor-pointer">{$currentSong?.artists?.map(artist => artist.name) || "Escoge una canción"}</span>
            </div>
        </div>
    )
}