import { currentSong, getTime, play } from "@/stores/audio";
import type { SongDB } from "@/lib/db"



export default function PlaylistSong({ song, index }: { song: SongDB, index: number }) {
    const handleClick = () => {
        if (!song.path) {return }
        currentSong.set(song)
        play()
    }

    console.log(song.lyrics)

    return (
        <div
            className={
                "flex flex-row items-center gap-4  transition-colors px-2 py-1 rounded " +
                (!song.path
                    ? "opacity-50"
                    : "hover:bg-zinc-500/10")
            }
            onClick={handleClick}
        >
            <img src={song.images[0].url} className="h-14 w-auto rounded" />
            <div className="w-full flex flex-col">
                <label className="text-base font-semibold">
                    {song.name}
                </label>
                <label className="text-sm">
                    {song.artists.map((artist, index) => <a href={`/artist/${artist.id}`} className="hover:underline" key={index}>{artist.name}{(index < song.artists.length - 1) ? ", " : ""}</a>)}
                </label>
            </div>
            <a href={`/album/${song.albumId}`} className="hover:underline text-nowrap w-full">{song.albumName || "Artista desconocido"}</a>

            <label className="text-sm text-white/80">
                {getTime(song.duration)}
            </label>
        </div>
    )
}