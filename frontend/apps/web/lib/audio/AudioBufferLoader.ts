import { audioEngine } from "./AudioEngine";

const MAX_CACHE_SIZE = 5;

export class AudioBufferLoader {
    private _cache = new Map<string, AudioBuffer>();
    private _pending = new Map<string, Promise<AudioBuffer>>();
    private _loadOrder: string[] = [];

    async load(url: string): Promise<AudioBuffer> {
        const cached = this._cache.get(url);
        if (cached) return cached;

        const pending = this._pending.get(url);
        if (pending) return pending;

        const promise = this._fetchAndDecode(url);
        this._pending.set(url, promise);

        try {
            const buffer = await promise;
            this._cache.set(url, buffer);
            this._loadOrder.push(url);
            this._evictIfNeeded();
            return buffer;
        } finally {
            this._pending.delete(url);
        }
    }

    preload(url: string): void {
        if (this._cache.has(url) || this._pending.has(url)) return;
        this.load(url).catch((): void => {});
    }

    release(url: string): void {
        this._cache.delete(url);
        const idx = this._loadOrder.indexOf(url);
        if (idx >= 0) this._loadOrder.splice(idx, 1);
    }

    clear(): void {
        this._cache.clear();
        this._loadOrder = [];
    }

    isLoaded(url: string): boolean {
        return this._cache.has(url);
    }

    private async _fetchAndDecode(url: string): Promise<AudioBuffer> {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        return audioEngine.decodeAudioData(arrayBuffer);
    }

    private _evictIfNeeded(): void {
        while (this._loadOrder.length > MAX_CACHE_SIZE) {
            const oldest = this._loadOrder.shift();
            if (oldest) this._cache.delete(oldest);
        }
    }
}

export const audioBufferLoader = new AudioBufferLoader();
