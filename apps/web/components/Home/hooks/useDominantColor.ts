interface DominantColor {
    r: number;
    g: number;
    b: number;
    hex: string;
    isLoading: boolean;
}

const FALLBACK: Omit<DominantColor, "isLoading"> = {
    r: 120,
    g: 120,
    b: 130,
    hex: "#787882",
};

function toHex(r: number, g: number, b: number): string {
    const c = (n: number): string => n.toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
}

export function parseDominantColor(
    hex: string | null | undefined
): DominantColor {
    if (!hex) return { ...FALLBACK, isLoading: false };
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b))
        return { ...FALLBACK, isLoading: false };
    return { r, g, b, hex: toHex(r, g, b), isLoading: false };
}
