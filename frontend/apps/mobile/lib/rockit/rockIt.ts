import { atom } from "nanostores";
import { toasterManager } from "../toasterManager";

// Minimal stub of the global RockIt singleton for mobile.
// Only the parts used by MobileLikeButton are implemented.
// If more managers are needed later they can be added here.

class MediaManager {
    // Holds publicIds of liked media
    likedMediaAtom = atom<string[]>([]);

    toggleLikeMedia(publicId: string) {
        const current = this.likedMediaAtom.get();
        if (current.includes(publicId)) {
            // unlike
            this.likedMediaAtom.set(current.filter((id) => id !== publicId));
        } else {
            // like
            this.likedMediaAtom.set([...current, publicId]);
        }
    }
}

export const rockIt = {
    mediaManager: new MediaManager(),
    toasterManager,
};
