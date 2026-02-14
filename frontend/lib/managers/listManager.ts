import { createArrayAtom } from "@/lib/store";
import apiFetch from "@/lib/utils/apiFetch";
import { RESPONSE_UNDEFINED_MESSAGE, rockIt } from "@/lib/rockit/rockIt";
import { DBListType } from "@/types/rockIt";
import { RockItAlbumWithoutSongs } from "../rockit/rockItAlbumWithoutSongs";
import { RockItPlaylist } from "../rockit/rockItPlaylist";

export class ListManager {
    private _libraryListsAtom = createArrayAtom<{
        publicId: string;
        type: DBListType;
    }>([]);

    // private _pinnedListsAtom = createArrayAtom<{
    //     publicId: string;
    //     type: DBListType;
    // }>([]);

    private _pinnedListsAtom = createArrayAtom<
        RockItAlbumWithoutSongs | RockItPlaylist
    >([]);

    constructor() {}

    // #region: Mehtods

    async addListToLibraryAsync(type: DBListType, publicId: string) {
        const response = await apiFetch(
            `/library/add-list/${type}/${publicId}`
        );

        if (!response) {
            rockIt.notificationManager.notifyError(RESPONSE_UNDEFINED_MESSAGE);
            return;
        }
        if (!response?.ok) {
            rockIt.notificationManager.notifyError(
                "Unable to add list to library."
            );
            return;
        }

        this._libraryListsAtom.push({ publicId, type });

        rockIt.notificationManager.notifyInfo("List added to library.");
    }

    async removeListFromLibraryAsync(type: DBListType, publicId: string) {
        const response = await apiFetch(
            `/library/remove-list/${type}/${publicId}`
        );

        if (!response) {
            rockIt.notificationManager.notifyError(RESPONSE_UNDEFINED_MESSAGE);
            return;
        }
        if (!response.ok) {
            rockIt.notificationManager.notifyError(
                "Unable to remove list from library."
            );
            return;
        }

        this._libraryListsAtom.set([
            ...this._libraryListsAtom
                .get()
                .filter((list) => list.publicId !== publicId),
        ]);
        rockIt.notificationManager.notifyInfo("List removed from library.");
    }

    async toggleListInLibraryAsync(type: DBListType, publicId: string) {
        if (this.listInLibrary(publicId))
            await this.removeListFromLibraryAsync(type, publicId);
        else await this.addListToLibraryAsync(type, publicId);
    }

    listInLibrary(publicId: string) {
        return this._libraryListsAtom
            .get()
            .some((list) => list.publicId == publicId);
    }

    async pinListAsync(type: DBListType, publicId: string) {
        const response = await apiFetch(`/pin/${type}/${publicId}`, {
            headers: { method: "POST" },
        });

        if (!response) {
            rockIt.notificationManager.notifyError(RESPONSE_UNDEFINED_MESSAGE);
            return;
        }
        if (!response.ok) {
            rockIt.notificationManager.notifyError(
                "Unable to remove list from library."
            );
            return;
        }

        throw "(pinListAsync) fetch list and add it to _pinnedListsAtom";

        // this._pinnedListsAtom.set([
        //     ...this._pinnedListsAtom.get(),
        //     { publicId, type },
        // ]);
        rockIt.notificationManager.notifyInfo("List pinned.");
    }

    async unPinListAsync(type: DBListType, publicId: string) {
        console.log(type, publicId);
        throw "(unPinListAsync) Not implemented method";
    }

    async togglePinListAsync(type: DBListType, publicId: string) {
        if (this.listIsPinned(publicId))
            await this.removeListFromLibraryAsync(type, publicId);
        else await this.addListToLibraryAsync(type, publicId);
    }

    listIsPinned(publicId: string) {
        return this._pinnedListsAtom
            .get()
            .some((list) => list.publicId == publicId);
    }

    async likeAllSongsAsync(type: DBListType, publicId: string) {
        console.log(type, publicId);
        throw "(likeAllSongsAsync) Not implemented method";
    }

    async addListToTopQueueAsync(type: DBListType, publicId: string) {
        console.log(type, publicId);
        throw "(addListToTopQueueAsync) Not implemented method";
    }

    async addListToBottomQueueAsync(type: DBListType, publicId: string) {
        console.log(type, publicId);
        throw "(addListToBottomQueueAsync) Not implemented method";
    }

    async downloadListZipAsync(type: DBListType, publicId: string) {
        console.log(type, publicId);
        throw "(downloadListZipAsync) Not implemented method";
        // const response = await apiFetch(`/zip-list/${type}/${id}`);

        // if (!response) {
        //     rockIt.notificationManager.notifyError(RESPONSE_UNDEFINED_MESSAGE);
        //     return;
        // }
        // if (!response.ok) {
        //     rockIt.notificationManager.notifyError("Unable to zip list.");
        //     return;
        // }
        // const jobId = (await response.json()).jobId;

        // const interval = setInterval(async () => {
        //     const response = await fetch(
        //         `/api/zip-list/${type}/${id}?jobId=${jobId}`
        //     );
        //     if (!response.ok) {
        //         console.warn("Response not ok");
        //         clearInterval(interval);
        //         return;
        //     }

        //     const json = await response.json();

        //     if (json.state == "completed") {
        //         const resultId = json.result;

        //         const a = document.createElement("a");
        //         const url = `/api/zip-list/${type}/${id}?getId=${resultId}`;

        //         a.href = url;

        //         document.body.appendChild(a);
        //         a.click();

        //         // Cleanup
        //         a.remove();
        //         window.URL.revokeObjectURL(url);
        //         clearInterval(interval);
        //     }
        // }, 2000);
    }

    async playAsync(type: DBListType, publicId: string) {
        console.log(type, publicId);
        throw "(playAsync) Not implemented method";
    }
    async downloadListToDeviceAsync(type: DBListType, publicId: string) {
        console.log(type, publicId);
        throw "(downloadListToDeviceAsync) Not implemented method";
    }

    // #endregion

    get libraryListsAtom() {
        return this._libraryListsAtom;
    }

    get pinnedListsAtom() {
        return this._pinnedListsAtom;
    }
}
