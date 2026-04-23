import type { AudioCore } from "./AudioCore";
import { mediaCacheManager } from "./MediaCacheManager";

const DEFAULT_PRELOAD_THRESHOLD_SEC = 20;

export class AudioPreloader {
    private _core: AudioCore;
    private _preloadedOriginalUrl: string | null = null;
    private _isPreloading = false;

    constructor(core: AudioCore) {
        this._core = core;
    }

    async onTimeUpdate(
        currentTime: number,
        duration: number,
        nextUri: string | null,
        nextPublicId: string | null,
        thresholdSec: number = DEFAULT_PRELOAD_THRESHOLD_SEC
    ): Promise<void> {
        if (!nextUri || !nextPublicId) return;
        if (this._isPreloading) return;
        if (this._preloadedOriginalUrl === nextUri) return;

        const remaining = duration - currentTime;
        if (remaining > thresholdSec) return;

        this._isPreloading = true;
        this._preloadedOriginalUrl = nextUri;

        try {
            const cachedUri = await mediaCacheManager.getCachedUri(
                nextUri,
                nextPublicId
            );

            if (cachedUri) {
                await this._core.loadIntoDeck(
                    this._core.inactiveDeck,
                    cachedUri
                );
            } else {
                const downloadedUri = await mediaCacheManager.downloadToCache(
                    nextUri,
                    nextPublicId
                );
                if (downloadedUri) {
                    await this._core.loadIntoDeck(
                        this._core.inactiveDeck,
                        downloadedUri
                    );
                } else {
                    await this._core.loadIntoDeck(
                        this._core.inactiveDeck,
                        nextUri
                    );
                }
            }
        } finally {
            this._isPreloading = false;
        }
    }

    isPreloaded(nextUri: string): boolean {
        return (
            this._preloadedOriginalUrl === nextUri &&
            this._core.isLoaded(this._core.inactiveDeck)
        );
    }

    reset() {
        this._preloadedOriginalUrl = null;
        this._isPreloading = false;
    }
}
