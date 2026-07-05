"use client";

import { useEffect, useMemo, useState } from "react";

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

const cache = new Map<string, Omit<DominantColor, "isLoading">>();
const SAMPLE_SIZE = 16;

function toHex(r: number, g: number, b: number): string {
    const c = (n: number): string => n.toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
}

function extractFromImage(
    img: HTMLImageElement
): Omit<DominantColor, "isLoading"> | null {
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

    let data: Uint8ClampedArray;
    try {
        data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
    } catch {
        return null;
    }

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let counted = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 200) continue;

        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luma < 18 || luma > 240) continue;

        rSum += r;
        gSum += g;
        bSum += b;
        counted++;
    }

    if (counted === 0) return null;

    const r = Math.round(rSum / counted);
    const g = Math.round(gSum / counted);
    const b = Math.round(bSum / counted);

    return { r, g, b, hex: toHex(r, g, b) };
}

export function useDominantColor(
    imageUrl: string | undefined
): DominantColor {
    const [tick, setTick] = useState(0);

    const color = useMemo<DominantColor>(() => {
        void tick;
        if (!imageUrl) return { ...FALLBACK, isLoading: false };
        const cached = cache.get(imageUrl);
        if (cached) return { ...cached, isLoading: false };
        return { ...FALLBACK, isLoading: true };
    }, [imageUrl, tick]);

    useEffect(() => {
        if (!imageUrl) return;
        if (cache.has(imageUrl)) return;

        let cancelled = false;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.decoding = "async";

        img.onload = () => {
            if (cancelled) return;
            const extracted = extractFromImage(img) ?? FALLBACK;
            cache.set(imageUrl, extracted);
            setTick((t) => t + 1);
        };

        img.onerror = () => {
            if (cancelled) return;
            cache.set(imageUrl, FALLBACK);
            setTick((t) => t + 1);
        };

        img.src = imageUrl;

        return () => {
            cancelled = true;
        };
    }, [imageUrl]);

    return color;
}
