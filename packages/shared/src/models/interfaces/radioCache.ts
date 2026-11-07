export interface RadioCacheEntry<T> {
    expiresAt: number;
    value: Promise<T>;
}
