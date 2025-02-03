import type { SongDB } from "@/db/song";
import {
    currentSong,
    playWhenReady,
    queue,
    queueIndex,
    randomQueue,
    songsInIndexedDB,
} from "@/stores/audio";
import { currentList } from "@/stores/currentList";

export function songHandleClick(
    song: SongDB<
        | "id"
        | "name"
        | "artists"
        | "albumName"
        | "albumId"
        | "duration"
        | "image"
        | "path"
    >,
    currentListSongs: SongDB<
        | "id"
        | "name"
        | "artists"
        | "image"
        | "duration"
        | "albumId"
        | "albumName"
        | "path"
    >[]
) {
    const _currentList = currentList.get();
    if (!song.path || !_currentList) {
        return;
    }

    if (_currentList.type == undefined || _currentList.id == undefined) {
        return;
    }

    let songsToAdd = currentListSongs
        .filter((song) => song?.path)
        .map((song, index) => {
            return {
                song: song,
                list: { type: _currentList.type, id: _currentList.id },
                index: index,
            };
        });

    if (!window.navigator.onLine) {
        songsToAdd = songsToAdd.filter((song) =>
            songsInIndexedDB.get()?.includes(song.song.id)
        );
    }

    if (randomQueue.get()) {
        const shuffled = [...songsToAdd].sort(() => Math.random() - 0.5);

        console.log({ songsToAdd, song });

        const firstSong = songsToAdd.find(
            (dataSong) => dataSong.song.id == song.id
        );
        if (!firstSong) {
            console.error("First song not found in songsToAdd in AlbumSong");
            return;
        }
        playWhenReady.set(true);
        currentSong.set(song);
        queueIndex.set(firstSong.index);
        queue.set(shuffled);
    } else {
        const firstSong = songsToAdd.find(
            (dataSong) => dataSong.song.id == song.id
        );
        if (!firstSong) {
            console.error("First song not found in songsToAdd in AlbumSong");
            return;
        }
        playWhenReady.set(true);
        currentSong.set(song);
        queueIndex.set(firstSong.index);
        queue.set(songsToAdd);
    }
}
