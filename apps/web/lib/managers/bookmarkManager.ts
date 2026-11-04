import { type BookmarkResponse } from "@/dto";
import type { BookmarkServices } from "@/models/interfaces/bookmarkServices";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    createArrayAtom,
    createAtom,
    ReadonlyArrayAtom,
    ReadonlyAtom,
} from "@/lib/store";

export type EBookmarkMode =
    "NOTHING" | "AUTOSKIP" | "REPEAT_FROM_BEGINNING" | "PREVIOUS_BOOKMARK";

export const BOOKMARK_MODE_COLORS: Record<EBookmarkMode, string> = {
    NOTHING: "#ffffff",
    AUTOSKIP: "#00ff00",
    REPEAT_FROM_BEGINNING: "#00ffff",
    PREVIOUS_BOOKMARK: "#ff8000",
};

export const BOOKMARK_MODE_MUTED_COLORS: Record<EBookmarkMode, string> = {
    NOTHING: "#999999",
    AUTOSKIP: "#006600",
    REPEAT_FROM_BEGINNING: "#006666",
    PREVIOUS_BOOKMARK: "#b35900",
};

export class BookmarkManager {
    private _currentMediaBookmarksAtom = createArrayAtom<BookmarkResponse>([]);
    private _showPopupAtom = createAtom<boolean>(false);
    private _editingBookmarkAtom = createAtom<BookmarkResponse | null>(null);
    private _active = false;
    private _unsubscribers: (() => void)[] = [];
    private _username?: string;
    private _bookmarksMediaId?: string;
    private _bookmarksRequest = 0;

    constructor(private readonly dependencies?: BookmarkServices) {}

    private get services(): BookmarkServices {
        return this.dependencies ?? rockIt;
    }

    start(): void {
        if (this._active || typeof window === "undefined") return;
        this._active = true;
        this._unsubscribers = [
            this.services.userManager.sessionAtom.subscribe((session) => {
                if (session?.username === this._username) return;
                this._username = session?.username;
                this.reset();
                void this._fetchCurrentMediaBookmarksAsync();
            }),
            this.services.queueManager.currentMediaAtom.listen(() => {
                void this._fetchCurrentMediaBookmarksAsync();
            }),
        ];
    }

    stop(): void {
        this._active = false;
        for (const unsubscribe of this._unsubscribers) unsubscribe();
        this._unsubscribers = [];
        this._username = undefined;
        this.reset();
    }

    private reset(): void {
        this._bookmarksRequest++;
        this._bookmarksMediaId = undefined;
        this._currentMediaBookmarksAtom.set([]);
        this.hidePopup();
    }

    private isCurrentRequest(request: number, mediaPublicId: string): boolean {
        return (
            this._active &&
            !!this._username &&
            request === this._bookmarksRequest &&
            this.services.queueManager.currentMedia?.publicId === mediaPublicId
        );
    }

    private async _fetchCurrentMediaBookmarksAsync(): Promise<void> {
        if (!this._active || !this._username) return;
        const media = this.services.queueManager.currentMedia;
        if (media?.publicId === this._bookmarksMediaId) return;
        this._bookmarksMediaId = media?.publicId;
        const request = ++this._bookmarksRequest;
        this._currentMediaBookmarksAtom.set([]);
        this.hidePopup();
        if (!media) {
            return;
        }

        const response = await Http.getBookmarks({
            mediaPublicId: media.publicId,
        });

        if (!this.isCurrentRequest(request, media.publicId)) return;

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
        const media = this.services.queueManager.currentMedia;
        if (!media || !this._active || !this._username) return null;

        const request = this._bookmarksRequest;
        const response = await Http.createBookmark({
            mediaPublicId: media.publicId,
            timestamp,
            description,
            mode,
        });

        if (!this.isCurrentRequest(request, media.publicId)) return null;

        if (response.isOk() && response.result) {
            this._currentMediaBookmarksAtom.push(response.result);
            this.services.notificationManager.notifySuccess("Bookmark saved");
            return response.result;
        }

        // Log detailed error for debugging
        console.error("Bookmark create error detail:", response);
        this.services.notificationManager.notifyError(
            typeof response.detail === "string"
                ? response.detail
                : "Failed to save bookmark"
        );
        return null;
    }

    async updateBookmarkAsync(
        publicId: string,
        timestamp: number | null,
        description: string | null,
        mode: EBookmarkMode | null
    ): Promise<BookmarkResponse | null> {
        const media = this.services.queueManager.currentMedia;
        if (!media || !this._active || !this._username) return null;
        const request = this._bookmarksRequest;
        const response = await Http.updateBookmark(publicId, {
            timestamp,
            description,
            mode,
        });

        if (!this.isCurrentRequest(request, media.publicId)) return null;

        if (response.isOk() && response.result) {
            const bookmarks = this._currentMediaBookmarksAtom.get();
            const index = bookmarks.findIndex(
                (b): boolean => b.publicId === publicId
            );
            if (index >= 0) {
                bookmarks[index] = response.result;
                this._currentMediaBookmarksAtom.set([...bookmarks]);
            }
            this.services.notificationManager.notifySuccess("Bookmark updated");
            return response.result;
        }

        this.services.notificationManager.notifyError(
            "Failed to update bookmark"
        );
        return null;
    }

    async deleteBookmarkAsync(publicId: string): Promise<boolean> {
        const media = this.services.queueManager.currentMedia;
        if (!media || !this._active || !this._username) return false;
        const request = this._bookmarksRequest;
        const response = await Http.deleteBookmark(publicId);

        if (!this.isCurrentRequest(request, media.publicId)) return false;

        if (response.isOk()) {
            const bookmarks = this._currentMediaBookmarksAtom.get();
            const index = bookmarks.findIndex(
                (b): boolean => b.publicId === publicId
            );
            if (index >= 0) {
                bookmarks.splice(index, 1);
                this._currentMediaBookmarksAtom.set([...bookmarks]);
            }
            this.services.notificationManager.notifySuccess("Bookmark deleted");
            return true;
        }

        this.services.notificationManager.notifyError(
            "Failed to delete bookmark"
        );
        return false;
    }

    skipToNextBookmark(): boolean {
        const bookmarks = this._currentMediaBookmarksAtom.get();
        const currentTime =
            this.services.mediaPlayerManager.currentTimeAtom.get();
        if (!bookmarks.length || currentTime === null) return false;

        const sorted = [...bookmarks].sort((a, b) => a.timestamp - b.timestamp);

        const next = sorted.find((b) => b.timestamp > currentTime + 0.5);
        if (next) {
            this.services.mediaPlayerManager.setCurrentTime(
                next.timestamp,
                true
            );
            return true;
        }
        return false;
    }

    skipToPrevBookmark(): boolean {
        const bookmarks = this._currentMediaBookmarksAtom.get();
        const currentTime =
            this.services.mediaPlayerManager.currentTimeAtom.get();
        if (!bookmarks.length || currentTime === null) return false;

        const sorted = [...bookmarks].sort((a, b) => a.timestamp - b.timestamp);
        if (sorted.length === 0) return false;

        const prev = [...sorted]
            .reverse()
            .find((b) => b.timestamp < currentTime - 0.5);
        if (prev) {
            this.services.mediaPlayerManager.setCurrentTime(
                prev.timestamp,
                true
            );
            return true;
        }
        if (
            currentTime >= sorted[0].timestamp - 0.5 &&
            sorted[0].timestamp > 0.5
        ) {
            this.services.mediaPlayerManager.setCurrentTime(0, true);
            return true;
        }
        return false;
    }

    openEditForBookmark(publicId: string): void {
        const bookmark = this._currentMediaBookmarksAtom
            .get()
            .find((b) => b.publicId === publicId);
        if (bookmark) {
            this._editingBookmarkAtom.set(bookmark);
            this._showPopupAtom.set(true);
        }
    }

    togglePopup(): void {
        const isOpening = !this._showPopupAtom.get();
        if (isOpening) {
            this._editingBookmarkAtom.set(null);
        }
        this._showPopupAtom.set(isOpening);
    }

    hidePopup(): void {
        this._editingBookmarkAtom.set(null);
        this._showPopupAtom.set(false);
    }

    clearEditingBookmark(): void {
        this._editingBookmarkAtom.set(null);
    }

    get editingBookmarkAtom(): ReadonlyAtom<BookmarkResponse | null> {
        return this._editingBookmarkAtom.getReadonlyAtom();
    }

    get currentMediaBookmarksAtom(): ReadonlyArrayAtom<BookmarkResponse> {
        return this._currentMediaBookmarksAtom.getReadonlyAtom();
    }

    get showPopupAtom(): ReadonlyAtom<boolean> {
        return this._showPopupAtom.getReadonlyAtom();
    }
}
