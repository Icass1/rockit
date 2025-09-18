import type { SongDB } from "@/db/song";
import {
    currentSong,
    playWhenReady,
    queue,
    queueIndex,
    randomQueue,
    send,
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
    if (!song.path) {
        console.warn("song.path is undefined. ( Song:", song, ")");
        return;
    }

    if (!_currentList) {
        console.warn("Current list is undefined");
        return;
    }

    if (_currentList.type == undefined || _currentList.id == undefined) {
        console.warn("Current list type or id is undefined");
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

    send({
        clickedSong: { previousSong: currentSong.get()?.id, nextSong: song.id },
    });

    if (randomQueue.get()) {
        const shuffled = [...songsToAdd].sort(() => Math.random() - 0.5);

        const firstSong = songsToAdd.find(
            (dataSong) => dataSong.song.id == song.id
        );

        if (!firstSong) {
            console.error("First song not found in songsToAdd in AlbumSong");
            return;
        }

        // Move firstSong to the first position
        const updatedQueue = [
            firstSong,
            ...shuffled.filter((s) => s.index !== firstSong.index),
        ];

        playWhenReady.set(true);
        currentSong.set(song);
        queueIndex.set(firstSong.index); // Since firstSong is now at index 0
        queue.set(updatedQueue);
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
