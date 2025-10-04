import { atom } from "nanostores";
import apiFetch from "@/lib/utils/apiFetch";
import { RESPONSE_UNDEFINED_MESSAGE, rockIt } from "@/lib/rockit";

export class ListManager {
    private _libraryListsAtom = atom<
        { publicId: string; type: "album" | "playlist" }[]
    >([]);
    private _pinnedListsAtom = atom<
        { publicId: string; type: "album" | "playlist" }[]
    >([]);

    constructor() {}

    // #region: Mehtods

    async addListToLibraryAsync(type: "album" | "playlist", publicId: string) {
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
        this._libraryListsAtom.set([
            ...this._libraryListsAtom.get(),
            { publicId, type },
        ]);
        rockIt.notificationManager.notifyInfo("List added to library.");
    }

    async removeListFromLibraryAsync(
        type: "album" | "playlist",
        publicId: string
    ) {
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

    async toggleListInLibraryAsync(
        type: "album" | "playlist",
        publicId: string
    ) {
        if (this.listInLibrary(publicId))
            await this.removeListFromLibraryAsync(type, publicId);
        else await this.addListToLibraryAsync(type, publicId);
    }

    listInLibrary(publicId: string) {
        return this._libraryListsAtom
            .get()
            .some((list) => list.publicId == publicId);
    }

    async pinListAsync(type: "album" | "playlist", publicId: string) {
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
        this._pinnedListsAtom.set([
            ...this._pinnedListsAtom.get(),
            { publicId, type },
        ]);
        rockIt.notificationManager.notifyInfo("List pinned.");
    }

    async unPinListAsync(type: "album" | "playlist", publicId: string) {
        console.log(type, publicId);
        throw "Not implemented method";
    }

    async togglePinListAsync(type: "album" | "playlist", publicId: string) {
        if (this.listIsPinned(publicId))
            await this.removeListFromLibraryAsync(type, publicId);
        else await this.addListToLibraryAsync(type, publicId);
    }

    listIsPinned(publicId: string) {
        return this._pinnedListsAtom
            .get()
            .some((list) => list.publicId == publicId);
    }

    async likeAllSongsAsync(type: "album" | "playlist", publicId: string) {
        console.log(type, publicId);
        throw "Not implemented method";
    }

    async addListToTopQueueAsync(type: "album" | "playlist", publicId: string) {
        console.log(type, publicId);
        throw "Not implemented method";
    }

    async addListToBottomQueueAsync(
        type: "album" | "playlist",
        publicId: string
    ) {
        console.log(type, publicId);
        throw "Not implemented method";
    }

    async downloadListZipAsync(type: "album" | "playlist", publicId: string) {
        console.log(type, publicId);
        throw "Not implemented method";
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

    // #endregion

    get libraryListsAtom() {
        return this._libraryListsAtom;
    }

    get pinnedListsAtom() {
        return this._pinnedListsAtom;
    }
}
