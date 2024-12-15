import type { SongDB } from "@/lib/db";
import { PlayCircle } from "lucide-react";
import { currentSong, play, queue, queueIndex } from "@/stores/audio";

export default function PlayList({
    songs,
    id,
    type,
}: {
    type: string;
    id: string;
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
        const songsToAdd = songs.map((song) => {
            return { song: song, list: { type, id } };
        });
        const song = songsToAdd[Math.floor(Math.random() * songs.length)];

        currentSong.set(song.song);
        play();

        const firstSong = songsToAdd.find(
            (dataSong) => dataSong.song.id == song.song.id
        );
        if (!firstSong) {
            console.error("song.id not in dataSong");
            return;
        }
        const index = songsToAdd.indexOf(firstSong);
        const newQueue = [
            firstSong,
            ...songsToAdd.slice(0, index),
            ...songsToAdd.slice(index + 1),
        ];
        queueIndex.set(0);
        queue.set(newQueue);
    };

    return (
        <PlayCircle
            strokeWidth={0.9}
            className="h-10 w-10 cursor-pointer"
            onClick={handleClick}
        />
    );
}
