export interface ArtworkResolver {
    resolveAsync(
        provider: string,
        artist: string,
        track: string
    ): Promise<string | null>;
}
export interface RecommendationArtworkCacheEntry {
    expiresAt: number;
    request: Promise<string | null>;
}
