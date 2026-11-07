import type {
    BookmarkResponse,
    CreateBookmarkRequest,
    UpdateBookmarkRequest,
} from "@rockit/shared";
import { getRockIt } from "@rockit/shared";
import { atom } from "nanostores";
import { Http } from "@/lib/http";
import { toasterManager } from "@/lib/toasterManager";

export class BookmarkManager {
    currentMediaBookmarksAtom = atom<BookmarkResponse[]>([]);
    showPopupAtom = atom<boolean>(false);
    editingBookmarkAtom = atom<BookmarkResponse | null>(null);
    private _initialized = false;
    private _unsubscribe?: () => void;
    private _request = 0;

    init(): void {
        if (this._initialized) return;
        this._initialized = true;

        // Load bookmarks whenever the current media changes.
        this._unsubscribe = getRockIt().queueManager.currentMediaAtom.subscribe(
            (): void => {
                const media = getRockIt().queueManager.currentMedia;
                if (media?.publicId) {
                    this.fetchBookmarksForMediaAsync(media.publicId);
                } else {
                    this.setBookmarks([]);
                }
            }
        );
    }

    stop(): void {
        this._request++;
        this._unsubscribe?.();
        this._unsubscribe = undefined;
        this._initialized = false;
        this.setBookmarks([]);
        this.showPopupAtom.set(false);
        this.editingBookmarkAtom.set(null);
    }

    skipToNextBookmark(): boolean {
        const bookmarks = this.currentMediaBookmarksAtom.get();
        const currentTime =
            getRockIt().mediaPlayerManager.currentTimeAtom.get();
        if (!bookmarks.length || currentTime === null) return false;

        const sorted = [...bookmarks].sort((a, b) => a.timestamp - b.timestamp);

        const next = sorted.find((b) => b.timestamp > currentTime + 0.5);
        if (next) {
            getRockIt().mediaPlayerManager.setCurrentTime(next.timestamp, true);
            return true;
        }
        return false;
    }

    skipToPrevBookmark(): boolean {
        const bookmarks = this.currentMediaBookmarksAtom.get();
        const currentTime =
            getRockIt().mediaPlayerManager.currentTimeAtom.get();
        if (!bookmarks.length || currentTime === null) return false;

        const sorted = [...bookmarks].sort((a, b) => a.timestamp - b.timestamp);
        if (sorted.length === 0) return false;

        const prev = [...sorted]
            .reverse()
            .find((b) => b.timestamp < currentTime - 0.5);
        if (prev) {
            getRockIt().mediaPlayerManager.setCurrentTime(prev.timestamp, true);
            return true;
        }
        if (
            currentTime >= sorted[0].timestamp - 0.5 &&
            sorted[0].timestamp > 0.5
        ) {
            getRockIt().mediaPlayerManager.setCurrentTime(0, true);
            return true;
        }
        return false;
    }

    async fetchBookmarksForMediaAsync(mediaPublicId: string): Promise<void> {
        const request = ++this._request;
        const response = await Http.getBookmarks({ mediaPublicId });
        if (request !== this._request) return;

        if (response.isOk() && response.result) {
            this.currentMediaBookmarksAtom.set(response.result.bookmarks);
        } else {
            this.currentMediaBookmarksAtom.set([]);
        }
    }

    setBookmarks(bookmarks: BookmarkResponse[]): void {
        this.currentMediaBookmarksAtom.set(bookmarks);
    }

    async createBookmarkAsync(
        mediaPublicId: string,
        timestamp: number,
        description: string | null,
        mode: string
    ): Promise<BookmarkResponse | null> {
        const request = this._request;
        const response = await Http.createBookmark({
            mediaPublicId,
            timestamp,
            description,
            mode,
        } as CreateBookmarkRequest);

        if (request !== this._request) return null;
        if (response.isOk() && response.result) {
            const current = this.currentMediaBookmarksAtom.get();
            this.currentMediaBookmarksAtom.set([...current, response.result]);
            toasterManager.notifySuccess(
                getRockIt().vocabularyManager.vocabulary.MOBILE_BOOKMARK_SAVED
            );
            return response.result;
        }

        toasterManager.notifyError(
            getRockIt().vocabularyManager.vocabulary.MOBILE_BOOKMARK_SAVE_ERROR
        );
        return null;
    }

    async updateBookmarkAsync(
        publicId: string,
        timestamp: number | null,
        description: string | null,
        mode: string | null
    ): Promise<BookmarkResponse | null> {
        const request = this._request;
        const response = await Http.updateBookmark(publicId, {
            timestamp,
            description,
            mode,
        } as UpdateBookmarkRequest);

        if (request !== this._request) return null;
        if (response.isOk() && response.result) {
            const bookmarks = this.currentMediaBookmarksAtom.get();
            const index = bookmarks.findIndex((b) => b.publicId === publicId);
            if (index >= 0) {
                const updated = [...bookmarks];
                updated[index] = response.result;
                this.currentMediaBookmarksAtom.set(updated);
            }
            toasterManager.notifySuccess(
                getRockIt().vocabularyManager.vocabulary.MOBILE_BOOKMARK_UPDATED
            );
            return response.result;
        }

        toasterManager.notifyError(
            getRockIt().vocabularyManager.vocabulary
                .MOBILE_BOOKMARK_UPDATE_ERROR
        );
        return null;
    }

    async deleteBookmarkAsync(publicId: string): Promise<boolean> {
        const request = this._request;
        const response = await Http.deleteBookmark(publicId);

        if (request !== this._request) return false;
        if (response.isOk()) {
            const bookmarks = this.currentMediaBookmarksAtom.get();
            const updated = bookmarks.filter((b) => b.publicId !== publicId);
            this.currentMediaBookmarksAtom.set(updated);
            toasterManager.notifySuccess(
                getRockIt().vocabularyManager.vocabulary.MOBILE_BOOKMARK_DELETED
            );
            return true;
        }

        toasterManager.notifyError(
            getRockIt().vocabularyManager.vocabulary
                .MOBILE_BOOKMARK_DELETE_ERROR
        );
        return false;
    }

    togglePopup(): void {
        const isOpening = !this.showPopupAtom.get();
        if (isOpening) {
            this.editingBookmarkAtom.set(null);
        }
        this.showPopupAtom.set(isOpening);
    }

    hidePopup(): void {
        this.editingBookmarkAtom.set(null);
        this.showPopupAtom.set(false);
    }

    openEditForBookmark(publicId: string): void {
        const bookmark = this.currentMediaBookmarksAtom
            .get()
            .find((b) => b.publicId === publicId);
        if (bookmark) {
            this.editingBookmarkAtom.set(bookmark);
            this.showPopupAtom.set(true);
        }
    }

    clearEditingBookmark(): void {
        this.editingBookmarkAtom.set(null);
    }
}
