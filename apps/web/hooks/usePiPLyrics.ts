"use client";

import type { PiPLyricsState } from "@/models/types/pip";
import { useLyricsSnapshot } from "@/hooks/useLyricsSnapshot";

export function usePiPLyrics(
    publicId: string | undefined,
    enabled: boolean
): PiPLyricsState {
    const state = useLyricsSnapshot(publicId, enabled);
    return {
        ...state,
        data: state.data
            ? {
                  lyrics: state.data.lines.map((line) => ({ text: line.text })),
                  dynamicLyrics: state.data.dynamic?.lines ?? null,
                  offset: state.data.offset,
              }
            : undefined,
    };
}
