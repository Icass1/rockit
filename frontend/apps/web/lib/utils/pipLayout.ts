import type { PiPLayout } from "@/models/types/pip";

export function getPiPLayout(width: number, height: number): PiPLayout {
    if (width < 260 || height < 150 || (width < 300 && height < 220))
        return "cover-only";
    if (width / height >= 1.5) return "pill";
    return width >= 400 && height >= 400 ? "full" : "sidebar";
}
