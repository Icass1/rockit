import { setRockIt } from "@rockit/shared";
import { atom } from "nanostores";
import { Http } from "@/lib/http";
import { BookmarkManager } from "@/lib/managers/bookmarkManager";
import { LockScreenManager } from "@/lib/managers/lockScreenManager";
import { MediaPlayerManager } from "@/lib/managers/mediaPlayerManager";
import { PlayerUIManager } from "@/lib/managers/playerUIManager";
import { QueueManager } from "@/lib/managers/queueManager";
import { UserManager } from "@/lib/managers/userManager";
import { VocabularyManager } from "@/lib/managers/vocabularyManager";
import { webSocketManager } from "@/lib/webSocketManager";
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

class RockIt {
    mediaManager = new MediaManager();
    bookmarkManager = new BookmarkManager();
    // `toasterManager` kept for existing consumers; `notificationManager` is the
    // slot the shared base managers use.
    toasterManager = toasterManager;
    notificationManager = toasterManager;
    webSocketManager = webSocketManager;
    vocabularyManager = new VocabularyManager();
    userManager = new UserManager();
    queueManager = new QueueManager();
    mediaPlayerManager = new MediaPlayerManager();
    playerUIManager = new PlayerUIManager();
    lockScreenManager = new LockScreenManager();
    http = Http;

    private _initialized = false;

    async init(): Promise<void> {
        if (this._initialized) return;
        this._initialized = true;

        this.mediaPlayerManager.init();
        this.bookmarkManager.init();
        // Load user settings (saved position / repeat / queue type) before the
        // queue restore uses them.
        await this.userManager.init();
        await this.queueManager.init();
        this.lockScreenManager.init();
    }
}

export const rockIt = new RockIt();

setRockIt(rockIt);
