import { currentSong, getTime, play, queue, queueIndex } from "@/stores/audio";
import type { PlaylistDB, SongDB } from "@/lib/db"



export default function PlaylistSong({ song, index, playlistId }: { song: SongDB<"name" | "albumId" | "duration" | "artists" | "path" | "albumName" | "images" | "id">, index: number, playlistId: string }) {
    const handleClick = () => {
        if (!song.path) {
            return
        }
        currentSong.set(song)
        play()

        fetch(`/api/playlist/${playlistId}`).then(response => response.json()).then((data: PlaylistDB) => {
            fetch(`/api/songs?songs=${data.songs.map(song => song.id).join(",")}&q=name,artists,id,images,duration`).then(response => response.json()).then((data: SongDB<"name" | "artists" | "id" | "images" | "duration">[]) => {
                const firstSong = data.find(dataSong => dataSong.id == song.id)
                if (!firstSong) {
                    console.error("song.id not in dataSong")
                    return
                }
                const index = data.indexOf(firstSong)
                const newQueue = [firstSong, ...data.slice(0, index), ...data.slice(index + 1)]
                queueIndex.set(0)
                queue.set(newQueue)
            })
        })
    }
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
                <label className="text-base font-semibold truncate w-full">
                    {song.name}
                </label>
                <label className="text-sm truncate  w-full">
                    {song.artists.map((artist, index) => <a href={`/artist/${artist.id}`} className="hover:underline" key={index}>{artist.name}{(index < song.artists.length - 1) ? ", " : ""}</a>)}
                </label>
            </div>
            <a href={`/album/${song.albumId}`} className="hover:underline text-nowrap w-full truncate">{song.albumName || "Artista desconocido"}</a>

            <label className="text-sm text-white/80">
                {getTime(song.duration)}
            </label>
        </div>
    )
}