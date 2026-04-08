import { ListType } from "@rockit/shared";

export class ListManager {
    // private _libraryListsAtom = createArrayAtom<{
    //     publicId: string;
    //     type: ListType;
    // }>([]);

    // async initLibrary() {
    //     const res = await baseApiFetch("/user/library");
    //     if (!res?.ok) return;
    //     const json = await res.json();
    //     const data = LibraryListsResponseSchema.parse(json);

    //     const lists: { publicId: string; type: ListType }[] = [];

    //     for (const album of data.albums) {
    //         lists.push({ publicId: album.publicId, type: "album" });
    //     }
    //     for (const playlist of data.playlists) {
    //         lists.push({ publicId: playlist.publicId, type: "playlist" });
    //     }

    //     // this._libraryListsAtom.set(lists);
    // }

    async addMediaToLibraryAsync(type: ListType, publicId: string) {
        // const response = await apiFetch(
        //     `/user/library/${type}/${publicId}`,
        //     OkResponseSchema
        // );
        // if (response.isOk()) {
        //     this._libraryListsAtom.push({ publicId, type });
        //     rockIt.notificationManager.notifySuccess(
        //         rockIt.vocabularyManager.vocabulary.MEDIA_ADDED_TO_LIBRARY
        //     );
        // } else if (response.isNotOk()) {
        //     rockIt.notificationManager.notifyError(
        //         rockIt.vocabularyManager.vocabulary
        //             .ERROR_ADDING_MEDIA_TO_LIBRARY
        //     );
        //     return;
        // }
    }

    async removeListFromLibraryAsync(type: ListType, publicId: string) {
        // const response = await apiFetch(`/user/library/${type}/${publicId}`, {
        //     method: "DELETE",
        // });
        // if (!response?.ok) {
        //     rockIt.notificationManager.notifyError(
        //         "Unable to remove list from library."
        //     );
        //     return;
        // }
        // const current = this._libraryListsAtom.get();
        // this._libraryListsAtom.set(
        //     current.filter((l) => l.publicId !== publicId)
        // );
        // rockIt.notificationManager.notifySuccess("List removed from library.");
    }

    // async toggleListInLibraryAsync(type: ListType, publicId: string) {
    //     if (this.listInLibrary(publicId)) {
    //         await this.removeListFromLibraryAsync(type, publicId);
    //     } else {
    //         await this.addMediaToLibraryAsync(type, publicId);
    //     }
    // }

    // listInLibrary(publicId: string) {
    //     return this._libraryListsAtom
    //         .get()
    //         .some((list) => list.publicId === publicId);
    // }

    async likeAllSongsAsync(type: ListType, publicId: string) {
        // let songPublicIds: string[];
        // try {
        //     const res = await apiFetch(`/media/${type}/${publicId}`);
        //     if (!res?.ok) {
        //         rockIt.notificationManager.notifyError(
        //             `Failed to fetch ${type}`
        //         );
        //         return;
        //     }
        //     const data = await res.json();
        //     const songs = data.songs || [];
        //     songPublicIds = songs.map(
        //         (song: { publicId: string }) => song.publicId
        //     );
        // } catch (error) {
        //     rockIt.notificationManager.notifyError(
        //         `Error fetching list: ${error}`
        //     );
        //     return;
        // }
        // if (songPublicIds.length === 0) {
        //     rockIt.notificationManager.notifyError("No songs found to like.");
        //     return;
        // }
        // const response = await apiPostFetch("/user/like/medias", , {
        //     body: JSON.stringify({ song_public_ids: songPublicIds }),
        // });
        // if (!response?.ok) {
        //     rockIt.notificationManager.notifyError("Unable to like all songs.");
        //     return;
        // }
        // const current = rockIt.mediaManager.likedMediaAtom.get();
        // const newLiked = [...new Set([...current, ...songPublicIds])];
        // rockIt.mediaManager.likedMediaAtom.set(newLiked);
        // rockIt.notificationManager.notifySuccess("All songs liked.");
    }

    // get libraryListsAtom() {
    //     return this._libraryListsAtom.getReadonlyAtom();
    // }
}
