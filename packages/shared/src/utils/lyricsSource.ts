/** LRCLIB IDs are positive safe integers, never arbitrary provider URLs. */
export function parseLyricsSourceId(value: string): number | undefined {
    const text = value.trim();
    if (!/^[1-9]\d*$/.test(text)) return undefined;
    const id = Number(text);
    return Number.isSafeInteger(id) ? id : undefined;
}
