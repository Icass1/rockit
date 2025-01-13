import { PlayCircle } from "lucide-react";
import {
    currentSong,
    play,
    queue,
    queueIndex,
    randomQueue,
} from "@/stores/audio";
import { currentListSongs } from "@/stores/currentList";

export default function PlayList({ id, type }: { type: string; id: string }) {
    const handleClick = () => {
        const songsToAdd = currentListSongs.get().map((song, index) => {
            return { song: song, list: { type, id }, index: index };
        });

        if (randomQueue.get()) {
            const shuffled = [...songsToAdd].sort(() => Math.random() - 0.5);

            currentSong.set(shuffled[0].song);
            queueIndex.set(shuffled[0].index);
            queue.set(shuffled);
            play();
        } else {
            currentSong.set(songsToAdd[0].song);
            queueIndex.set(0);
            queue.set(songsToAdd);
            play();
        }
    };

    return (
        <PlayCircle
            strokeWidth={1.2}
            className="h-[1.95rem] w-[1.95rem] -translate-y-[1px] cursor-pointer hover:scale-105"
            onClick={handleClick}
        />
    );
}
