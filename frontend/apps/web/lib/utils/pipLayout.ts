import type { PiPLayout } from "@/models/types/pip";

export function getPiPLayout(width: number, height: number): PiPLayout {
    if (width >= 360 && height >= 96 && height < 180) return "pill";
    if (width >= 160 && width < 260 && height >= Math.max(300, width * 1.8))
        return "narrow";
    if (width < 260 || height < 150 || (width < 300 && height < 220))
        return "cover-only";
    if (width / height >= 1.5) return "pill";
    return width >= 400 && height >= 400 ? "full" : "sidebar";
}
