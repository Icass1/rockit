/** Read the first HTTP(S) link, ignoring URI-list comments and non-link text. */
export function droppedUrl(uriList: string, plainText: string): string | null {
    const candidate =
        uriList
            .split(/\r?\n/)
            .find((line) => line.trim() && !line.startsWith("#"))
            ?.trim() || plainText.trim();
    if (!candidate || /\s/.test(candidate)) return null;
    try {
        const url = new URL(candidate);
        return url.protocol === "https:" || url.protocol === "http:"
            ? url.href
            : null;
    } catch {
        return null;
    }
}

export function isLinkDrag(types: readonly string[]): boolean {
    return (
        !types.includes("Files") &&
        (types.includes("text/uri-list") || types.includes("text/plain"))
    );
}
