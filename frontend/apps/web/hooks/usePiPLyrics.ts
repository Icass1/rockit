"use client";

import { useEffect, useState } from "react";
import type { PiPLyricsResult, PiPLyricsState } from "@/models/types/pip";
import { Http } from "@/lib/http";

export function usePiPLyrics(
    publicId: string | undefined,
    enabled: boolean
): PiPLyricsState {
    const [result, setResult] = useState<PiPLyricsResult | undefined>();
    const cachedId = result?.publicId;
    useEffect((): (() => void) | undefined => {
        if (!enabled || !publicId || cachedId === publicId) return;
        let cancelled = false;
        void Http.getLrclibLyricsAsync(publicId)
            .then((response): void => {
                if (cancelled) return;
                setResult({
                    publicId,
                    data: response.isOk() ? response.result : undefined,
                    failed: !response.isOk(),
                });
            })
            .catch((error: unknown): void => {
                if (cancelled) return;
                console.error("PiP lyrics unavailable", error);
                setResult({ publicId, failed: true });
            });
        return (): void => {
            cancelled = true;
        };
    }, [enabled, publicId, cachedId]);
    return {
        data: cachedId === publicId ? result?.data : undefined,
        loading: enabled && !!publicId && cachedId !== publicId,
        failed: cachedId === publicId && result?.failed === true,
    };
}
