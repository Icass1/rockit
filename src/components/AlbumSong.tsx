import { currentSong, play, queue, queueIndex } from "@/stores/audio";
import type { AlbumDB, SongDB } from "@/lib/db";
import { getTime } from "@/lib/getTime";

export default function AlbumSong({
    song,
    index,
    albumId,
}: {
    song: SongDB<
        | "images"
        | "id"
        | "name"
        | "artists"
        | "albumId"
        | "albumName"
        | "path"
        | "duration"
    >;
    index: number;
    albumId: string;
}) {
    const handleClick = () => {
        if (!song.path) {
            return;
        }
        currentSong.set(song);
        play();

        fetch(`/api/album/${albumId}`)
            .then((response) => response.json())
            .then((data: AlbumDB) => {
                fetch(
                    `/api/songs?songs=${data.songs.join(
                        ","
                    )}&q=name,artists,id,images,duration`
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
                            const firstSong = data.find(
                                (dataSong) => dataSong.id == song.id
                            );
                            if (!firstSong) {
                                console.error("song.id not in dataSong");
                                return;
                            }
                            const index = data.indexOf(firstSong);
                            const newQueue = [
                                firstSong,
                                ...data.slice(0, index),
                                ...data.slice(index + 1),
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
                (!song.path ? "opacity-50" : "hover:bg-zinc-500/10")
            }
            onClick={handleClick}
        >
            <label className="text-sm text-white/80 w-10 text-center">
                {index + 1}
            </label>
            <label className="text-base font-semibold w-full">
                {song.name}{" "}
                {/*<label className="text-xs text-neutral-400">{song.id}</label>*/}
            </label>
            <label className="text-sm text-white/80">
                {getTime(song.duration)}
            </label>
        </div>
    );
}
