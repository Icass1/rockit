import {
    EEvent,
    EWebSocketMessage,
    isSearchResult,
    TMedia,
    TMediaWithSearch,
} from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

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

    init(): void {
        if (this._init) return;
        this._init = true;

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.LibraryMediaAdded,
            (data): void => this.libraryMediaAddedHandler(data.publicId)
        );

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.LibraryMediaRemoved,
            (data): void => this.libraryMediaRemovedHandler(data.publicId)
        );
    }

    async addMediaToLibrary(media: TMediaWithSearch): Promise<void> {
        if (isSearchResult(media)) {
            const searchItem = media;
            rockIt.notificationManager.notifyInfo(
                rockIt.vocabularyManager.vocabulary.ADDING_MEDIA_TO_LIBRARY
            );
            const res = await Http.addFromUrlAsync({
                url: searchItem.providerUrl,
                addToPlaylist: false,
                addToLibrary: true,
                playlistPublicId: null,
            });

            if (!res.isOk()) {
                rockIt.notificationManager.notifyError(res.message);
            } else {
                rockIt.eventManager.dispatchEvent(EEvent.MediaAddedToLibrary, {
                    publicId: res.result.data.publicId,
                });
                rockIt.notificationManager.notifySuccess(
                    `"${searchItem.name}" ${rockIt.vocabularyManager.vocabulary.ADDED_TO_LIBRARY}`
                );
            }
        } else {
            const res = await Http.addMediaToLibrary(media.publicId);
            if (!res.isOk()) {
                rockIt.notificationManager.notifyError(res.message);
            } else {
                rockIt.notificationManager.notifySuccess(
                    `"${media.name}" ${rockIt.vocabularyManager.vocabulary.ADDED_TO_LIBRARY}`
                );
            }
        }
    }

    async addUrlToLibraryAsync(url: string): Promise<void> {
        rockIt.notificationManager.notifyInfo(
            rockIt.vocabularyManager.vocabulary.ADDING_MEDIA_TO_LIBRARY
        );
        try {
            const res = await Http.addFromUrlAsync({
                url,
                addToPlaylist: false,
                addToLibrary: true,
                playlistPublicId: null,
            });
            if (!res.isOk()) {
                rockIt.notificationManager.notifyError(res.message);
                return;
            }
            rockIt.eventManager.dispatchEvent(EEvent.MediaAddedToLibrary, {
                publicId: res.result.data.publicId,
            });
            rockIt.notificationManager.notifySuccess(
                `"${res.result.data.name}" ${rockIt.vocabularyManager.vocabulary.ADDED_TO_LIBRARY}`
            );
        } catch {
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.LIBRARY_DROP_ERROR
            );
        }
    }

    async removeMediaFromLibrary(media: TMedia): Promise<void> {
        const res = await Http.removeMediaFromLibrary(media.publicId);
        if (res.isNotOk()) {
            rockIt.notificationManager.notifyError(res.message);
        }
    }

    private libraryMediaAddedHandler(publicId: string): void {
        rockIt.eventManager.dispatchEvent(EEvent.MediaAddedToLibrary, {
            publicId: publicId,
        });
    }

    private libraryMediaRemovedHandler(publicId: string): void {
        rockIt.eventManager.dispatchEvent(EEvent.MediaRemovedFromLibrary, {
            publicId: publicId,
        });
    }
}
