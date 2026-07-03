import type {
    BookmarkResponse,
    CreateBookmarkRequest,
    UpdateBookmarkRequest,
} from "@rockit/shared";
import { atom } from "nanostores";
import { Http } from "@/lib/http";
import { toasterManager } from "@/lib/toasterManager";

export const BOOKMARK_MODE_COLORS: Record<string, string> = {
    NOTHING: "#ffffff",
    AUTOSKIP: "#00ff00",
    REPEAT_FROM_BEGINNING: "#00ffff",
    PREVIOUS_BOOKMARK: "#ff8000",
};

export const BOOKMARK_MODE_MUTED_COLORS: Record<string, string> = {
    NOTHING: "#999999",
    AUTOSKIP: "#006600",
    REPEAT_FROM_BEGINNING: "#006666",
    PREVIOUS_BOOKMARK: "#b35900",
};

export class BookmarkManager {
    currentMediaBookmarksAtom = atom<BookmarkResponse[]>([]);
    showPopupAtom = atom<boolean>(false);
    editingBookmarkAtom = atom<BookmarkResponse | null>(null);

    async fetchBookmarksForMediaAsync(mediaPublicId: string): Promise<void> {
        const response = await Http.getBookmarks({ mediaPublicId });

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
        const response = await Http.createBookmark({
            mediaPublicId,
            timestamp,
            description,
            mode,
        } as CreateBookmarkRequest);

        if (response.isOk() && response.result) {
            const current = this.currentMediaBookmarksAtom.get();
            this.currentMediaBookmarksAtom.set([...current, response.result]);
            toasterManager.notifySuccess("Bookmark saved");
            return response.result;
        }

        toasterManager.notifyError("Failed to save bookmark");
        return null;
    }

    async updateBookmarkAsync(
        publicId: string,
        timestamp: number | null,
        description: string | null,
        mode: string | null
    ): Promise<BookmarkResponse | null> {
        const response = await Http.updateBookmark(publicId, {
            timestamp,
            description,
            mode,
        } as UpdateBookmarkRequest);

        if (response.isOk() && response.result) {
            const bookmarks = this.currentMediaBookmarksAtom.get();
            const index = bookmarks.findIndex((b) => b.publicId === publicId);
            if (index >= 0) {
                const updated = [...bookmarks];
                updated[index] = response.result;
                this.currentMediaBookmarksAtom.set(updated);
            }
            toasterManager.notifySuccess("Bookmark updated");
            return response.result;
        }

        toasterManager.notifyError("Failed to update bookmark");
        return null;
    }

    async deleteBookmarkAsync(publicId: string): Promise<boolean> {
        const response = await Http.deleteBookmark(publicId);

        if (response.isOk()) {
            const bookmarks = this.currentMediaBookmarksAtom.get();
            const updated = bookmarks.filter((b) => b.publicId !== publicId);
            this.currentMediaBookmarksAtom.set(updated);
            toasterManager.notifySuccess("Bookmark deleted");
            return true;
        }

        toasterManager.notifyError("Failed to delete bookmark");
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
