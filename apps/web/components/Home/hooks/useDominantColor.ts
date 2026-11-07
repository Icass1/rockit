import type { DominantColor } from "@/models/interfaces/artworkColor";

const FALLBACK: Omit<DominantColor, "isLoading"> = {
    r: 0,
    g: 0,
    b: 0,
    hex: "var(--theme-media-accent)",
};

function toHex(r: number, g: number, b: number): string {
    const c = (n: number): string => n.toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
}

export function parseDominantColor(
    hex: string | null | undefined
): DominantColor {
    if (!hex || !/^#[0-9a-f]{6}$/i.test(hex))
        return { ...FALLBACK, isLoading: false };
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b))
        return { ...FALLBACK, isLoading: false };
    return { r, g, b, hex: toHex(r, g, b), isLoading: false };
}
