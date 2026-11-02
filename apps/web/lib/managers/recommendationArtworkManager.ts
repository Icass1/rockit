import type { RecommendationArtworkCacheEntry } from "@/models/interfaces/recommendationArtworkCache";
import { rockIt } from "@/lib/rockit/rockIt";

/** Visible covers only, with two requests at a time and shared in-flight results. */
export class RecommendationArtworkManager {
    private cache = new Map<string, RecommendationArtworkCacheEntry>();
    private active = 0;
    private waiting: (() => void)[] = [];

    resolveAsync(
        provider: string,
        artist: string,
        track: string
    ): Promise<string | null> {
        const key = JSON.stringify([provider, artist, track]);
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > Date.now()) return cached.request;
        if (this.cache.size >= 256)
            this.cache.delete(this.cache.keys().next().value!);
        const entry: RecommendationArtworkCacheEntry = {
            expiresAt: Infinity,
            request: this.lookupAsync(provider, artist, track).then((image) => {
                entry.expiresAt = Date.now() + (image ? 86400000 : 60000);
                return image;
            }),
        };
        this.cache.set(key, entry);
        return entry.request;
    }

    private async lookupAsync(
        provider: string,
        artist: string,
        track: string
    ): Promise<string | null> {
        if (this.active >= 2)
            await new Promise<void>((resolve) => this.waiting.push(resolve));
        else this.active++;
        try {
            const response = await rockIt.http.getRecommendationArtwork(
                provider,
                artist,
                track
            );
            return response.isOk() ? response.result.imageUrl : null;
        } catch {
            return null;
        } finally {
            const next = this.waiting.shift();
            if (next) next();
            else this.active--;
        }
    }
}
