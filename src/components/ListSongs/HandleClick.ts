import { RockItSongWithoutAlbum } from "@/lib/rockit/rockItSongWithoutAlbum";

export function songHandleClick(
    song: RockItSongWithoutAlbum,
    currentListSongs: RockItSongWithoutAlbum[]
) {
    console.log("songHandleClick", { song, currentListSongs });
    throw "(songHandleClick) Method not implemented";

    // const _currentList = rockIt.queueManager.currentList;

    // if (!_currentList) {
    //     console.warn("Current list is undefined");
    //     return;
    // }

    // if (_currentList.type == undefined || _currentList.publicId == undefined) {
    //     console.warn("Current list type or id is undefined");
    //     return;
    // }

    // let songsToAdd = currentListSongs
    //     .filter((song) => song?.path)
    //     .map((song, index) => {
    //         return {
    //             song: song,
    //             list: { type: _currentList.type, id: _currentList.publicId },
    //             index: index,
    //         };
    //     });

    // if (!window.navigator.onLine) {
    //     songsToAdd = songsToAdd.filter((song) =>
    //         songsInIndexedDB.get()?.includes(song.song.publicId)
    //     );
    // }

    // if (randomQueue.get()) {
    //     const shuffled = [...songsToAdd].sort(() => Math.random() - 0.5);

    //     const firstSong = songsToAdd.find(
    //         (dataSong) => dataSong.song.id == song.id
    //     );

    //     if (!firstSong) {
    //         console.error("First song not found in songsToAdd in AlbumSong");
    //         return;
    //     }

    //     // Move firstSong to the first position
    //     const updatedQueue = [
    //         firstSong,
    //         ...shuffled.filter((s) => s.index !== firstSong.index),
    //     ];

    //     playWhenReady.set(true);
    //     currentSong.set(song);
    //     queueIndex.set(firstSong.index); // Since firstSong is now at index 0
    //     queue.set(updatedQueue);
    // } else {
    //     const firstSong = songsToAdd.find(
    //         (dataSong) => dataSong.song.id == song.id
    //     );
    //     if (!firstSong) {
    //         console.error("First song not found in songsToAdd in AlbumSong");
    //         return;
    //     }
    //     playWhenReady.set(true);
    //     currentSong.set(song);
    //     queueIndex.set(firstSong.index);
    //     queue.set(songsToAdd);
    // }
}
