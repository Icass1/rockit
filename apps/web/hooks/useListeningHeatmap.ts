"use client";

import { useEffect, useState } from "react";
import type { ListeningHeatmapState } from "@/models/types/listeningHeatmap";
import { listeningHeatmapManager } from "@/lib/managers/listeningHeatmapManager";

export function useListeningHeatmap(
    publicId: string | undefined
): ListeningHeatmapState {
    const [state, setState] = useState<ListeningHeatmapState>({
        segments: [],
        status: "loading",
    });
    useEffect(() => {
        if (!publicId) return;
        const controller = new AbortController();
        const refresh = async (): Promise<void> => {
            try {
                const segments = await listeningHeatmapManager.load(
                    publicId,
                    controller.signal
                );
                if (!controller.signal.aborted)
                    setState({ publicId, segments, status: "ready" });
            } catch {
                if (!controller.signal.aborted)
                    setState({ publicId, segments: [], status: "error" });
            }
        };
        void refresh();
        const interval = setInterval(() => void refresh(), 30_000);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [publicId]);
    return state.publicId === publicId
        ? state
        : { segments: [], status: "loading" as const };
}
