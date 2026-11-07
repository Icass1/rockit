import {
    HttpResult,
    MediaResponse,
    RecommendationArtworkManager,
    setRockIt,
    type SessionResponse,
} from "@rockit/shared";
import { atom } from "nanostores";
import { Http } from "@/lib/http";
import { BookmarkManager } from "@/lib/managers/bookmarkManager";
import { LockScreenManager } from "@/lib/managers/lockScreenManager";
import { MediaPlayerManager } from "@/lib/managers/mediaPlayerManager";
import { PlayerUIManager } from "@/lib/managers/playerUIManager";
import { QueueManager } from "@/lib/managers/queueManager";
import { userManager } from "@/lib/managers/userManager";
import { vocabularyManager } from "@/lib/managers/vocabularyManager";
import { toasterManager } from "@/lib/toasterManager";
import { webSocketManager } from "@/lib/webSocketManager";

class MediaManager {
    likedMediaAtom = atom<string[]>([]);

    getMedia(publicId: string): Promise<HttpResult<MediaResponse>> {
        return Http.getMediaAsync(publicId);
    }

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
    recommendationArtworkManager = new RecommendationArtworkManager(Http);
    bookmarkManager = new BookmarkManager();
    // `toasterManager` kept for existing consumers; `notificationManager` is the
    // slot the shared base managers use.
    toasterManager = toasterManager;
    notificationManager = toasterManager;
    webSocketManager = webSocketManager;
    vocabularyManager = vocabularyManager;
    userManager = userManager;
    queueManager = new QueueManager();
    mediaPlayerManager = new MediaPlayerManager();
    playerUIManager = new PlayerUIManager();
    lockScreenManager = new LockScreenManager();
    http = Http;

    private _initialized = false;
    private _username?: string;
    private _generation = 0;
    private _initializing?: Promise<void>;

    async init(session?: SessionResponse): Promise<void> {
        if (session && this._username && session.username !== this._username)
            this.stop();
        if (session) {
            this.userManager.seedSession(session);
            this._username = session.username;
        }
        if (this._initialized) return;
        if (this._initializing) return this._initializing;
        const generation = this._generation;
        const initialize = async () => {
            void this.webSocketManager.init();
            this.mediaPlayerManager.init();
            this.bookmarkManager.init();
            await this.userManager.init();
            if (generation !== this._generation) return;
            await this.queueManager.init();
            if (generation !== this._generation) return;
            this.lockScreenManager.init();
            this._initialized = true;
        };
        const pending = initialize()
            .catch((error: unknown) => {
                if (generation === this._generation) this.stop();
                throw error;
            })
            .finally(() => {
                if (this._initializing === pending)
                    this._initializing = undefined;
            });
        this._initializing = pending;
        return pending;
    }
    stop(): void {
        this._generation++;
        this._initializing = undefined;
        this.webSocketManager.stop();
        this.bookmarkManager.stop();
        this.mediaPlayerManager.stopAndClear();
        this.mediaPlayerManager.stopSynchronization();
        this.queueManager.reset();
        this.lockScreenManager.destroy();
        this.userManager.stop();
        this._initialized = false;
        this._username = undefined;
    }
}

export const rockIt = new RockIt();

setRockIt(rockIt);
