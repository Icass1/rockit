"use client";

import { useEffect, useState } from "react";
import type { ArtworkResolver } from "@rockit/shared";

/** Bounded per-presenter state; lookup pacing/cache are owned by the resolver. */
export function useArtworkCandidate(
    resolver: ArtworkResolver,
    source: string | null | undefined,
    provider: string,
    artist: string,
    track: string,
    enabled = true
) {
    const uri = source?.trim() ?? "";
    const key = JSON.stringify([provider, artist, track, uri]);
    const [failed, setFailed] = useState<{ key: string; urls: string[] }>();
    const [resolved, setResolved] = useState<{ key: string; url: string }>();
    const failures = failed?.key === key ? failed.urls : [];
    const needsLookup = !uri || failures.includes(uri);
    const candidate = needsLookup
        ? resolved?.key === key
            ? resolved.url
            : undefined
        : uri;
    useEffect(() => {
        if (!enabled || !needsLookup || !provider || !artist || !track) return;
        let cancelled = false;
        void resolver.resolveAsync(provider, artist, track).then((url) => {
            if (!cancelled && url) setResolved({ key, url });
        });
        return () => {
            cancelled = true;
        };
    }, [resolver, enabled, needsLookup, provider, artist, track, key]);
    return {
        uri: candidate && !failures.includes(candidate) ? candidate : undefined,
        reportFailure: (url: string) =>
            setFailed((previous) => ({
                key,
                urls: Array.from(
                    new Set([
                        ...(previous?.key === key ? previous.urls : []),
                        url,
                    ])
                ).slice(-3),
            })),
    };
}
