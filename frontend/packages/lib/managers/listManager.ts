import { BaseAlbumWithoutSongsResponse, BasePlaylistResponse } from "@/dto";
import { DBListType } from "@/types/rockIt";
import { RESPONSE_UNDEFINED_MESSAGE, rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom } from "@/lib/store";
import { baseApiFetch } from "@/lib/utils/apiFetch";

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
        BaseAlbumWithoutSongsResponse | BasePlaylistResponse
    >([]);

    constructor() {}

    // #region: Mehtods

    async addListToLibraryAsync(type: DBListType, publicId: string) {
        const response = await baseApiFetch(
            `/user/library/${type}/${publicId}`,
            {
                method: "POST",
            }
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
        const response = await baseApiFetch(
            `/user/library/${type}/${publicId}`,
            {
                method: "DELETE",
            }
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
        const response = await baseApiFetch(`/pin/${type}/${publicId}`, {
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
        let songPublicIds: string[];

        try {
            if (type === "album") {
                const res = await fetch(`/media/album/${publicId}`, {
                    credentials: "include",
                });
                if (!res.ok) {
                    rockIt.notificationManager.notifyError(
                        `Failed to fetch album: ${res.status}`
                    );
                    return;
                }
                const album = await res.json();
                if (!album.songs) {
                    rockIt.notificationManager.notifyError(
                        "Album has no songs"
                    );
                    return;
                }
                songPublicIds = album.songs.map(
                    (song: { publicId: string }) => song.publicId
                );
            } else if (type === "playlist") {
                const res = await fetch(`/media/playlist/${publicId}`, {
                    credentials: "include",
                });
                if (!res.ok) {
                    rockIt.notificationManager.notifyError(
                        `Failed to fetch playlist: ${res.status}`
                    );
                    return;
                }
                const playlist = await res.json();
                if (!playlist.songs) {
                    rockIt.notificationManager.notifyError(
                        "Playlist has no songs"
                    );
                    return;
                }
                songPublicIds = playlist.songs.map(
                    (song: { publicId: string }) => song.publicId
                );
            } else {
                rockIt.notificationManager.notifyError("Invalid list type.");
                return;
            }
        } catch (error) {
            rockIt.notificationManager.notifyError(
                `Error fetching list: ${error}`
            );
            return;
        }

        if (songPublicIds.length === 0) {
            rockIt.notificationManager.notifyError("No songs found to like.");
            return;
        }

        const response = await baseApiFetch("/user/like/songs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ song_public_ids: songPublicIds }),
        });

        if (!response) {
            rockIt.notificationManager.notifyError(RESPONSE_UNDEFINED_MESSAGE);
            return;
        }
        if (!response.ok) {
            rockIt.notificationManager.notifyError("Unable to like all songs.");
            return;
        }

        const current = rockIt.mediaManager.likedMediaAtom.get();
        const newLiked = [...new Set([...current, ...songPublicIds])];
        rockIt.mediaManager.likedMediaAtom.set(newLiked);

        rockIt.notificationManager.notifyInfo("All songs liked.");
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
        //         `zip-list/${type}/${id}?jobId=${jobId}`
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
        //         const url = `zip-list/${type}/${id}?getId=${resultId}`;

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
