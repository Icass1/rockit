export interface RecommendationArtworkCacheEntry {
    expiresAt: number;
    request: Promise<string | null>;
}
