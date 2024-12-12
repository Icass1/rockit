import type { SongDB } from "@/lib/db";
import { PlayCircle } from "lucide-react";
import { currentSong, play, queue, queueIndex } from "@/stores/audio";

export default function PlayList({
    songs,
}: {
    songs: SongDB<
        | "id"
        | "name"
        | "artists"
        | "images"
        | "duration"
        | "albumId"
        | "albumName"
    >[];
}) {
    const handleClick = () => {
        const song = songs[Math.floor(Math.random() * songs.length)];

        currentSong.set(song);
        play();

        const firstSong = songs.find((dataSong) => dataSong.id == song.id);
        if (!firstSong) {
            console.error("song.id not in dataSong");
            return;
        }
        const index = songs.indexOf(firstSong);
        const newQueue = [
            firstSong,
            ...songs.slice(0, index),
            ...songs.slice(index + 1),
        ];
        queueIndex.set(0);
        queue.set(newQueue);
    };

    return (
        <PlayCircle
            strokeWidth={0.9}
            className="h-10 w-10"
            onClick={handleClick}
        />
    );
}
