import { atom } from "nanostores";
import { BookmarkManager } from "@/lib/managers/bookmarkManager";
import { toasterManager } from "../toasterManager";

class MediaManager {
    likedMediaAtom = atom<string[]>([]);

    toggleLikeMedia(publicId: string) {
        const current = this.likedMediaAtom.get();
        if (current.includes(publicId)) {
            this.likedMediaAtom.set(current.filter((id) => id !== publicId));
        } else {
            this.likedMediaAtom.set([...current, publicId]);
        }
    }
}

export const rockIt = {
    mediaManager: new MediaManager(),
    bookmarkManager: new BookmarkManager(),
    toasterManager,
};
