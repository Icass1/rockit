"use client";

import { useEffect, useState } from "react";
import type { ListeningHeatmapState } from "@/models/types/listeningHeatmap";
import { listeningHeatmapManager } from "@/lib/managers/listeningHeatmapManager";
import { rockIt } from "@/lib/rockit/rockIt";

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
        const player = rockIt.mediaPlayerManager;
        let baseline: ListeningHeatmapState["segments"] | undefined;
        let playedUntil = 0;
        const publish = (): void => {
            if (active && baseline)
                setState({
                    publicId,
                    segments: listeningHeatmapManager.withPlayback(
                        baseline,
                        playedUntil
                    ),
                    status: "ready",
                });
        };
        const onPlayback = (): void => {
            if (
                player.playingAtom.get() &&
                rockIt.queueManager.currentMedia?.publicId === publicId
            ) {
                playedUntil = player.currentTimeAtom.get();
                publish();
            }
        };
        const unsubscribeTime = player.currentTimeAtom.listen(onPlayback);
        const unsubscribePlaying = player.playingAtom.listen(onPlayback);
        onPlayback();
        const load = async (): Promise<void> => {
            try {
                baseline = await listeningHeatmapManager.load(publicId);
                publish();
            } catch {
                if (active)
                    setState({ publicId, segments: [], status: "error" });
            }
        };
        void load();
        return () => {
            active = false;
            unsubscribeTime();
            unsubscribePlaying();
        };
    }, [publicId]);
    return state.publicId === publicId
        ? state
        : { segments: [], status: "loading" as const };
}
