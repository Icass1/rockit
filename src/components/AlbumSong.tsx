import { currentSong, getTime, play } from "@/stores/audio";
import type { songDB } from "@/types/types"



export default function AlbumSong({ song, index }: { song: songDB, index: number }) {
    const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        currentSong.set(song)
        play()
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