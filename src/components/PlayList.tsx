import { PlayCircle } from "lucide-react";
import {
    currentSong,
    playWhenReady,
    queue,
    queueIndex,
    randomQueue,
    songsInIndexedDB,
} from "@/stores/audio";
import { currentListSongs } from "@/stores/currentList";

export function playListHandleClick({
    type,
    id,
}: {
    type: string;
    id: string;
}) {
    let songsToAdd = currentListSongs
        .get()
        .filter((song) => song?.path)
        .map((song, index) => {
            return { song: song, list: { type, id }, index: index };
        });

    if (songsToAdd.length == 0) return;

    if (!window.navigator.onLine) {
        songsToAdd = songsToAdd.filter((song) =>
            songsInIndexedDB.get()?.includes(song.song.id)
        );
    }

    if (randomQueue.get()) {
        const shuffled = [...songsToAdd].sort(() => Math.random() - 0.5);
        playWhenReady.set(true);

        currentSong.set(shuffled[0].song);
        queueIndex.set(shuffled[0].index);
        queue.set(shuffled);
    } else {
        playWhenReady.set(true);

        currentSong.set(songsToAdd[0].song);
        queueIndex.set(0);
        queue.set(songsToAdd);
    }
}
export default function PlayList({ id, type }: { type: string; id: string }) {
    return (
        <PlayCircle
            strokeWidth={1.2}
            className="h-[1.95rem] w-[1.95rem] -translate-y-[1px] cursor-pointer hover:scale-105"
            onClick={() => playListHandleClick({ type, id })}
        />
    );
}
