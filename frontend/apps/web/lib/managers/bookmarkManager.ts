import { EWebSocketMessage } from "@rockit/packages/shared";
import { type BookmarkResponse } from "@/dto";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom, ReadonlyArrayAtom, ReadonlyAtom } from "@/lib/store";

export type EBookmarkMode = "NOTHING" | "AUTOSKIP";

export class BookmarkManager {
    private _currentMediaBookmarksAtom = createArrayAtom<BookmarkResponse>([]);
    private _showPopupAtom = createAtom<boolean>(false);
    private _initialized = false;

    async init(): Promise<void> {
        if (this._initialized) return;
        this._initialized = true;

        // Fetch bookmarks when current media changes
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.CurrentMedia,
            () => {
                this._fetchCurrentMediaBookmarksAsync();
            }
        );

        // Also respond to changes in currentMediaAtom by polling approach
        // When queue manager sets a new current media, fetch bookmarks
        const media = rockIt.queueManager.currentMedia;
        if (media) {
            await this._fetchCurrentMediaBookmarksAsync();
        }
    }

    private async _fetchCurrentMediaBookmarksAsync(): Promise<void> {
        const media = rockIt.queueManager.currentMedia;
        if (!media) {
            this._currentMediaBookmarksAtom.set([]);
            return;
        }

        const response = await Http.getBookmarks({
            mediaPublicId: media.publicId,
        });

        if (response.isOk() && response.result) {
            this._currentMediaBookmarksAtom.set(response.result.bookmarks);
        } else {
            this._currentMediaBookmarksAtom.set([]);
        }
    }

    async createBookmarkAsync(
        timestamp: number,
        description: string | null,
        mode: EBookmarkMode = "NOTHING"
    ): Promise<BookmarkResponse | null> {
        const media = rockIt.queueManager.currentMedia;
        if (!media) return null;

        console.log('Creating bookmark payload:', {
            mediaPublicId: media.publicId,
            timestamp,
            description,
            mode,
        });
        const response = await Http.createBookmark({
            mediaPublicId: media.publicId,
            timestamp,
            description,
            mode,
        });

        if (response.isOk() && response.result) {
            this._currentMediaBookmarksAtom.push(response.result);
            rockIt.notificationManager.notifySuccess("Bookmark saved");
            return response.result;
        }

        // Log detailed error for debugging
        console.error("Bookmark create error detail:", response);
        rockIt.notificationManager.notifyError(
            typeof response.detail === "string" ? response.detail : "Failed to save bookmark"
        );
        return null;
    }

    async updateBookmarkAsync(
        publicId: string,
        timestamp: number | null,
        description: string | null,
        mode: EBookmarkMode | null
    ): Promise<BookmarkResponse | null> {
        const response = await Http.updateBookmark(publicId, {
            timestamp,
            description,
            mode,
        });

        if (response.isOk() && response.result) {
            const bookmarks = this._currentMediaBookmarksAtom.get();
            const index = bookmarks.findIndex(
                (b): boolean => b.publicId === publicId
            );
            if (index >= 0) {
                bookmarks[index] = response.result;
                this._currentMediaBookmarksAtom.set([...bookmarks]);
            }
            rockIt.notificationManager.notifySuccess("Bookmark updated");
            return response.result;
        }

        rockIt.notificationManager.notifyError("Failed to update bookmark");
        return null;
    }

    async deleteBookmarkAsync(publicId: string): Promise<boolean> {
        const response = await Http.deleteBookmark(publicId);

        if (response.isOk()) {
            const bookmarks = this._currentMediaBookmarksAtom.get();
            const index = bookmarks.findIndex(
                (b): boolean => b.publicId === publicId
            );
            if (index >= 0) {
                bookmarks.splice(index, 1);
                this._currentMediaBookmarksAtom.set([...bookmarks]);
            }
            rockIt.notificationManager.notifySuccess("Bookmark deleted");
            return true;
        }

        rockIt.notificationManager.notifyError("Failed to delete bookmark");
        return false;
    }

    get currentMediaBookmarksAtom(): ReadonlyArrayAtom<BookmarkResponse> {
        return this._currentMediaBookmarksAtom.getReadonlyAtom();
    }

    get showPopupAtom(): ReadonlyAtom<boolean> {
        return this._showPopupAtom.getReadonlyAtom();
    }

    togglePopup(): void {
        this._showPopupAtom.set(!this._showPopupAtom.get());
    }

    hidePopup(): void {
        this._showPopupAtom.set(false);
    }
}
