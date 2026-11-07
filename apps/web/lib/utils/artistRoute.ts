export function normalizeArtistPageName(name: string): string {
    return name.normalize("NFC").replace(/\s+/g, " ").trim();
}

// Decode encoded route segments at the page boundary, never in provider
// matching or on names supplied directly by search results.
export function artistNameFromRoute(segment: string): string {
    try {
        return normalizeArtistPageName(decodeURIComponent(segment));
    } catch {
        return normalizeArtistPageName(segment);
    }
}
