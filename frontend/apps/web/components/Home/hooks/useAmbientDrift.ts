"use client";

import { useEffect, useMemo, useState } from "react";

export interface DriftParticle {
    id: string;
    top: number;
    left: number;
    size: number;
    blurPx: number;
    opacity: number;
    duration: number;
    delay: number;
    driftX: number;
    driftY: number;
    rotate: number;
}

function mulberry32(seed: number) {
    let a = seed;
    return function random() {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashSeed(key: string): number {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function getReducedMotionInitial(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(getReducedMotionInitial);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        function handler(e: MediaQueryListEvent): void {
            setReduced(e.matches);
        }
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    return reduced;
}

export function useAmbientDrift(
    seedKeys: string[],
    options?: { maxParticles?: number }
): DriftParticle[] {
    const reducedMotion = usePrefersReducedMotion();
    const maxParticles = options?.maxParticles ?? 7;
    const keys = useMemo(
        () => seedKeys.slice(0, maxParticles),
        [seedKeys, maxParticles]
    );

    return useMemo(() => {
        const count = keys.length;
        if (count === 0) return [];

        const cols = Math.ceil(Math.sqrt(count * 1.6));
        const rows = Math.ceil(count / cols);
        const cellW = 100 / cols;
        const cellH = 100 / rows;

        return keys.map((key, index) => {
            const rand = mulberry32(hashSeed(key) + index);

            const col = index % cols;
            const row = Math.floor(index / cols);

            const jitterX = (rand() - 0.5) * cellW * 0.6;
            const jitterY = (rand() - 0.5) * cellH * 0.6;

            const top = Math.min(
                92,
                Math.max(4, row * cellH + cellH / 2 + jitterY)
            );
            const left = Math.min(
                92,
                Math.max(4, col * cellW + cellW / 2 + jitterX)
            );

            const depth = rand();
            const size = 64 + depth * 96;
            const blurPx = 6 - depth * 4;
            const opacity = 0.14 + depth * 0.18;

            return {
                id: key,
                top,
                left,
                size: Math.round(size),
                blurPx: Math.max(1, Math.round(blurPx)),
                opacity: Number(opacity.toFixed(2)),
                duration: reducedMotion
                    ? 0
                    : Math.round(18 + (1 - depth) * 14),
                delay: reducedMotion ? 0 : Number((rand() * 4).toFixed(2)),
                driftX: reducedMotion
                    ? 0
                    : Math.round(14 + depth * 18) * (rand() > 0.5 ? 1 : -1),
                driftY: reducedMotion
                    ? 0
                    : Math.round(10 + depth * 14) * (rand() > 0.5 ? 1 : -1),
                rotate: reducedMotion
                    ? 0
                    : Number((2 + rand() * 3).toFixed(1)) *
                      (rand() > 0.5 ? 1 : -1),
            };
        });
    }, [keys, reducedMotion]);
}
