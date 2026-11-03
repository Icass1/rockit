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
        let active = true;
        const refresh = async (): Promise<void> => {
            try {
                const segments = await listeningHeatmapManager.load(publicId);
                if (active) setState({ publicId, segments, status: "ready" });
            } catch {
                if (active)
                    setState({ publicId, segments: [], status: "error" });
            }
        };
        void refresh();
        const interval = setInterval(() => void refresh(), 30_000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [publicId]);
    return state.publicId === publicId
        ? state
        : { segments: [], status: "loading" as const };
}
