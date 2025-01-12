import { PlayCircle } from "lucide-react";
import { currentSong, play, queue, queueIndex } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { currentListSongs } from "@/stores/currentList";

export default function PlayList({ id, type }: { type: string; id: string }) {
    const $songs = useStore(currentListSongs);

    const handleClick = () => {
        const songsToAdd = $songs.map((song, index) => {
            return { song: song, list: { type, id }, index: index };
        });
        const song = songsToAdd[Math.floor(Math.random() * $songs.length)];

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
            strokeWidth={1.2}
            className="h-[1.95rem] w-[1.95rem] -translate-y-[1px] cursor-pointer hover:scale-105"
            onClick={handleClick}
        />
    );
}
