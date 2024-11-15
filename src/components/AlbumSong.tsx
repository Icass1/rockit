import { songSrc } from "@/stores/audio";
import { useStore } from "@nanostores/react";

function getTime(seconds: number) {
    seconds = Math.round(seconds);

    if (typeof seconds !== "number" || isNaN(seconds)) {
        return "Invalid input";
    }

    // Calculate minutes and remaining seconds
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    // Format the result with leading zeros
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");

    return `${formattedMinutes}:${formattedSeconds}`;
}

export default function AlbumSong({ song, index }: { index: number }) {

    const $songSrc = useStore(songSrc)
    
    const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        songSrc.set(song)

    }

    return (
        <div
            className={
                "flex flex-row items-center gap-4  transition-colors px-2 py-1 rounded " +
                (song.path == "None"
                    ? "opacity-50"
                    : "hover:bg-zinc-500/10")
            }
            onClick={handleClick}
        >
            <label className="text-sm text-white/80 w-10 text-center">
                {index + 1}
            </label>
            <label className="text-base font-semibold w-full">
                {song.name}
            </label>
            <label className="text-sm text-white/80">
                {getTime(song.duration)}
            </label>
        </div>
    )
}