/**
 * useVideoEngine — Manages expo-video player as visual layer only.
 * Should ONLY be used when track has video. Audio engine is the real playback master.
 * Handles video rendering and syncs to audio engine state.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useVideoPlayer, type VideoPlayer } from "expo-video";

interface VideoEngineCallbacks {
    onTimeUpdate?: (positionSec: number, durationSec: number) => void;
    onPlayingChange?: (isPlaying: boolean) => void;
    onEnded?: () => void;
    onLoadStart?: () => void;
    onLoaded?: () => void;
}

export interface VideoEngineControls {
    player: VideoPlayer | null;
    hasVideo: boolean;
    attachVideo: (uri: string) => Promise<void>;
    detachVideo: () => Promise<void>;
    syncToAudioState: (
        playing: boolean,
        position: number,
        volume?: number
    ) => void;
}

export function useVideoEngine(
    callbacks?: VideoEngineCallbacks
): VideoEngineControls {
    const callbacksRef = useRef(callbacks);
    useEffect(() => {
        if (callbacks) {
            callbacksRef.current = callbacks;
        }
    });

    const [hasVideo, setHasVideo] = useState(false);
    const [player, setPlayer] = useState<VideoPlayer | null>(null);

    // Create player with null source (lazy initialization)
    const videoPlayer = useVideoPlayer(null, (p) => {
        p.loop = false;
        p.volume = 1;
    });

    useEffect(() => {
        setPlayer(videoPlayer);

        const sub1 = videoPlayer.addListener(
            "playingChange",
            ({ isPlaying }) => {
                callbacksRef.current?.onPlayingChange?.(isPlaying);
            }
        );

        const sub2 = videoPlayer.addListener(
            "timeUpdate",
            ({ currentTime }) => {
                const duration = videoPlayer.duration ?? 0;
                callbacksRef.current?.onTimeUpdate?.(currentTime, duration);
            }
        );

        const sub3 = videoPlayer.addListener("playToEnd", () => {
            callbacksRef.current?.onEnded?.();
        });

        const sub4 = videoPlayer.addListener("statusChange", ({ status }) => {
            if (status === "loading") {
                callbacksRef.current?.onLoadStart?.();
            } else if (status === "readyToPlay") {
                callbacksRef.current?.onLoaded?.();
            }
        });

        return () => {
            sub1.remove();
            sub2.remove();
            sub3.remove();
            sub4.remove();
        };
    }, [videoPlayer]);

    const attachVideo = useCallback(
        async (uri: string) => {
            callbacksRef.current?.onLoadStart?.();
            await videoPlayer.replaceAsync({ uri });
            setHasVideo(true);
            callbacksRef.current?.onLoaded?.();
        },
        [videoPlayer]
    );

    const detachVideo = useCallback(async () => {
        await videoPlayer.pause();
        videoPlayer.volume = 0;
        setHasVideo(false);
    }, [videoPlayer]);

    const syncToAudioState = useCallback(
        (playing: boolean, position: number, volume: number = 1) => {
            if (!hasVideo) return;

            // Sync position
            if (Math.abs(videoPlayer.currentTime - position) > 0.5) {
                videoPlayer.currentTime = position;
            }

            // Sync volume
            videoPlayer.volume = volume;

            // Sync play/pause
            if (playing && !videoPlayer.playing) {
                videoPlayer.play();
            } else if (!playing && videoPlayer.playing) {
                videoPlayer.pause();
            }
        },
        [hasVideo, videoPlayer]
    );

    return {
        player: videoPlayer,
        hasVideo,
        attachVideo,
        detachVideo,
        syncToAudioState,
    };
}
