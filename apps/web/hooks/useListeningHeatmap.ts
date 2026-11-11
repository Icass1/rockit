"use client";

import { useEffect, useState } from "react";
import type { ListeningHeatmapState } from "@/models/types/listeningHeatmap";
import { listeningHeatmapManager } from "@/lib/managers/listeningHeatmapManager";
import { ListeningHeatmapPlayback } from "@/lib/managers/listeningHeatmapPlayback";
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
        const playback = new ListeningHeatmapPlayback(
            player.playingAtom.get(),
            player.currentTimeAtom.get()
        );
        const publish = (currentTime = player.currentTimeAtom.get()): void => {
            if (active && baseline)
                setState({
                    publicId,
                    segments: listeningHeatmapManager.withPlayback(
                        baseline,
                        playback.intervals
                    ),
                    currentCount: listeningHeatmapManager.countAt(
                        baseline,
                        currentTime,
                        playback.completed,
                        playback.active
                    ),
                    status: "ready",
                });
        };
        const unsubscribeTime = player.currentTimeAtom.listen(() => publish());
        const unsubscribePlaying = player.playingAtom.listen((playing) => {
            if (rockIt.queueManager.currentMedia?.publicId !== publicId) return;
            playback.setPlaying(playing, player.currentTimeAtom.get());
            publish();
        });
        const unsubscribePosition = player.playbackPositionAtom.listen(
            (position) => {
                if (position?.mediaPublicId !== publicId) return;
                playback.observe(position);
                publish(position.timeTo);
            }
        );
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
            unsubscribePosition();
        };
    }, [publicId]);
    return state.publicId === publicId
        ? state
        : { segments: [], currentCount: 0, status: "loading" as const };
}
