import { currentSong, play, queue, queueIndex } from "@/stores/audio";
import type { PlaylistDB, SongDB } from "@/lib/db";
import { getTime } from "@/lib/getTime";
import LikeButton from "./LikeButton";

export default function PlaylistSong({
    song,
    playlistId,
}: {
    song: SongDB<
        | "name"
        | "albumId"
        | "duration"
        | "artists"
        | "path"
        | "albumName"
        | "image"
        | "id"
        | "images"
    >;
    playlistId: string;
}) {
    const handleClick = () => {
        if (!song.path) {
            return;
        }
        currentSong.set(song);
        play();

        fetch(`/api/playlist/${playlistId}`)
            .then((response) => response.json())
            .then((data: PlaylistDB) => {
                fetch(
                    `/api/songs?songs=${data.songs
                        .map((song) => song.id)
                        .join(",")}&q=name,artists,id,images,duration`
                )
                    .then((response) => response.json())
                    .then(
                        (
                            data: SongDB<
                                | "name"
                                | "artists"
                                | "id"
                                | "images"
                                | "duration"
                            >[]
                        ) => {
                            const newData = data.map((song) => {
                                return {
                                    song: song,
                                    list: { type: "playlist", id: playlistId },
                                };
                            });

                            const firstSong = newData.find(
                                (dataSong) => dataSong.song.id == song.id
                            );
                            if (!firstSong) {
                                console.error("song.id not in dataSong");
                                return;
                            }
                            const index = newData.indexOf(firstSong);
                            const newQueue = [
                                firstSong,
                                ...newData.slice(0, index),
                                ...newData.slice(index + 1),
                            ];
                            queueIndex.set(0);
                            queue.set(newQueue);
                        }
                    );
            });
    };
    return (
        <div
            className={
                "flex flex-row items-center gap-4  transition-colors px-2 py-1 rounded " +
                (!song.path ? "opacity-50" : "md:hover:bg-zinc-500/10")
            }
            onClick={handleClick}
        >
            <div className="h-14 w-auto aspect-square rounded relative">
                <img
                    src={`/api/image/${song.image}`}
                    className="rounded absolute top-0 bottom-0 left-0 right-0"
                />
            </div>

            <div className="w-full flex flex-col">
                <label className="text-base font-semibold truncate w-full">
                    {song.name}
                </label>
                <label className="text-sm truncate  w-full">
                    {song.artists.map((artist, index) => (
                        <a
                            href={`/artist/${artist.id}`}
                            className="md:hover:underline"
                            key={index}
                            onClick={(event) => event.stopPropagation()}
                        >
                            {artist.name}
                            {index < song.artists.length - 1 ? ", " : ""}
                        </a>
                    ))}
                </label>
            </div>
            <div className="w-full">
                <a
                    href={`/album/${song.albumId}`}
                    className="md:hover:underline text-nowrap truncate"
                    onClick={(event) => event.stopPropagation()}
                >
                    {song.albumName || "Artista desconocido"}
                </a>
            </div>
            <LikeButton song={song} />

            <label className="text-sm text-white/80">
                {getTime(song.duration)}
            </label>
        </div>
    );
}
