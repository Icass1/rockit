import {
    AddFromUrlResponseSchema,
    EEvent,
    EWebSocketMessage,
    isSearchResult,
    OkResponseSchema,
    TMedia,
    TMediaWithSearch,
} from "@rockit/packages/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiDeleteFetch, apiFetch } from "@/lib/utils/apiFetch";

export class LibraryManager {
    static #instance: LibraryManager;

    private _init: boolean;

    constructor() {
        this._init = false;

        if (LibraryManager.#instance) {
            return LibraryManager.#instance;
        }

        LibraryManager.#instance = this;
        return LibraryManager.#instance;
    }

    init() {
        if (this._init) return;
        this._init = true;

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.LibraryMediaAdded,
            (data) => this.libraryMediaAddedHandler(data.publicId)
        );

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.LibraryMediaRemoved,
            (data) => this.libraryMediaRemovedHandler(data.publicId)
        );
    }

    async addMediaToLibrary(media: TMediaWithSearch) {
        if (isSearchResult(media)) {
            const searchItem = media;
            const res = await apiFetch(
                `/media/url/add?url=${encodeURIComponent(searchItem.providerUrl)}`,
                AddFromUrlResponseSchema
            );

            if (!res.isOk()) {
                rockIt.notificationManager.notifyError(res.message);
            } else {
                rockIt.eventManager.dispatchEvent(EEvent.MediaAddedToLibrary, {
                    publicId: res.result.data.publicId,
                });
                rockIt.notificationManager.notifySuccess(
                    `"${searchItem.name}" added to library`
                );
            }
        } else {
            const res = await apiFetch(
                `/user/library/media/${media.publicId}`,
                OkResponseSchema
            );

            if (!res.isOk()) {
                rockIt.notificationManager.notifyError(res.message);
            } else {
                rockIt.notificationManager.notifySuccess(
                    `"${media.name}" added to library`
                );
            }
        }
    }

    async removeMediaFromLibrary(media: TMedia) {
        const res = await apiDeleteFetch(
            `/user/library/media/${media.publicId}`,
            OkResponseSchema
        );
        if (res.isNotOk()) {
            rockIt.notificationManager.notifyError(res.message);
        }
    }

    private libraryMediaAddedHandler(publicId: string) {
        rockIt.eventManager.dispatchEvent(EEvent.MediaAddedToLibrary, {
            publicId: publicId,
        });
    }

    private libraryMediaRemovedHandler(publicId: string) {
        rockIt.eventManager.dispatchEvent(EEvent.MediaRemovedFromLibrary, {
            publicId: publicId,
        });
    }
}
