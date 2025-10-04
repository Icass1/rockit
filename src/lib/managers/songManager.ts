import { RockItSongWithAlbum } from "@/types/rockIt";
import { atom } from "nanostores";

export class SongManager {
    // #region: Atoms

    private _likedSongsAtom = atom<string[]>([]);

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    toggleLikeSong(songPublicId: string) {
        //  if (rockIt.songManager.likedSongsAtom.get().includes(song.publicId)) {
        //                             fetch(`/api/like/${song.publicId}`, {
        //                                 method: "DELETE",
        //                             }).then((response) => {
        //                                 if (response.ok) {
        //                                     // Remove song to liked songs store
        //                                     likedSongs.set(
        //                                         likedSongs
        //                                             .get()
        //                                             .filter(
        //                                                 (likedSong) =>
        //                                                     likedSong != song.publicId
        //                                             )
        //                                     );
        //                                 } else {
        //                                     console.log("Error");
        //                                     // Tell user like request was unsuccessful
        //                                 }
        //                             });
        //                         } else {
        //                             fetch(`/api/like/${song.publicId}`, {
        //                                 method: "POST",
        //                             }).then((response) => {
        //                                 if (response.ok) {
        //                                     // Add song to liked songs store
        //                                     likedSongs.set([
        //                                         ...likedSongs.get(),
        //                                         song.publicId,
        //                                     ]);
        //                                 } else {
        //                                     console.log("Error");
        //                                     // Tell user like request was unsuccessful
        //                                 }
        //                             });
        //                         }

        console.warn("toggleLikeSong", songPublicId);
        throw new Error("Method not implemented.");
    }

    playSong(song: RockItSongWithAlbum) {
        console.log(song);
        throw new Error("Method not implemented.");
        // const _currentList = currentList.get();
        // if (!song.path) {
        //     console.warn("song.path is undefined. ( Song:", song, ")");
        //     return;
        // }

        // if (!_currentList) {
        //     console.warn("Current list is undefined");
        //     return;
        // }

        // if (_currentList.type == undefined || _currentList.id == undefined) {
        //     console.warn("Current list type or id is undefined");
        //     return;
        // }

        // let songsToAdd = currentListSongs
        //     .filter((song) => song?.path)
        //     .map((song, index) => {
        //         return {
        //             song: song,
        //             list: { type: _currentList.type, id: _currentList.id },
        //             index: index,
        //         };
        //     });

        // if (!window.navigator.onLine) {
        //     songsToAdd = songsToAdd.filter((song) =>
        //         songsInIndexedDB.get()?.includes(song.song.id)
        //     );
        // }

        // if (randomQueue.get()) {
        //     const shuffled = [...songsToAdd].sort(() => Math.random() - 0.5);

        //     const firstSong = songsToAdd.find(
        //         (dataSong) => dataSong.song.id == song.id
        //     );

        //     if (!firstSong) {
        //         console.error(
        //             "First song not found in songsToAdd in AlbumSong"
        //         );
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
        //         console.error(
        //             "First song not found in songsToAdd in AlbumSong"
        //         );
        //         return;
        //     }
        //     playWhenReady.set(true);
        //     currentSong.set(song);
        //     queueIndex.set(firstSong.index);
        //     queue.set(songsToAdd);
        // }
    }

    // #region: Getters

    get likedSongsAtom() {
        return this._likedSongsAtom;
    }

    // #endregion: Getters
}
