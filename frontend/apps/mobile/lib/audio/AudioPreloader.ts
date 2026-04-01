import type { AudioCore } from "./AudioCore";

const DEFAULT_PRELOAD_THRESHOLD_SEC = 20;

export class AudioPreloader {
    private _core: AudioCore;
    private _preloadedUri: string | null = null;
    private _isPreloading = false;

    constructor(core: AudioCore) {
        this._core = core;
    }

    async onTimeUpdate(
        currentTime: number,
        duration: number,
        nextUri: string | null,
        thresholdSec: number = DEFAULT_PRELOAD_THRESHOLD_SEC
    ): Promise<void> {
        if (!nextUri) return;
        if (this._isPreloading) return;
        if (this._preloadedUri === nextUri) return;

        const remaining = duration - currentTime;
        if (remaining > thresholdSec) return;

        this._isPreloading = true;
        this._preloadedUri = nextUri;

        try {
            await this._core.loadIntoDeck(this._core.inactiveDeck, nextUri);
        } finally {
            this._isPreloading = false;
        }
    }

    isPreloaded(nextUri: string): boolean {
        return (
            this._preloadedUri === nextUri &&
            this._core.isLoaded(this._core.inactiveDeck)
        );
    }

    reset() {
        this._preloadedUri = null;
        this._isPreloading = false;
    }
}
