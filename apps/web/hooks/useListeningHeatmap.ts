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
        currentCount: 0,
        status: "loading",
    });
    useEffect(() => {
        if (!publicId) return;
        let active = true;
        const player = rockIt.mediaPlayerManager;
        let baseline: ListeningHeatmapState["segments"] | undefined;
        let playedUntil: number | undefined;
        const publish = (): void => {
            if (active && baseline)
                setState({
                    publicId,
                    segments: listeningHeatmapManager.withPlayback(
                        baseline,
                        playedUntil ?? 0
                    ),
                    currentCount: listeningHeatmapManager.countAt(
                        baseline,
                        player.currentTimeAtom.get(),
                        playedUntil
                    ),
                    status: "ready",
                });
        };
        const onPlayback = (): void => {
            if (rockIt.queueManager.currentMedia?.publicId !== publicId) return;
            if (player.playingAtom.get())
                playedUntil = player.currentTimeAtom.get();
            publish();
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
                    setState({
                        publicId,
                        segments: [],
                        currentCount: 0,
                        status: "error",
                    });
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
        : { segments: [], currentCount: 0, status: "loading" as const };
}
