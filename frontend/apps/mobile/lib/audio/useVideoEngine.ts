/**
 * useVideoEngine — Manages expo-video player for video tracks.
 *
 * expo-video handles both the audio and visual tracks of a video file.
 * Background playback is enabled via staysActiveInBackground.
 * This engine is used exclusively for video content; audio-only tracks
 * go through useAudioEngine instead.
 */

import { useCallback, useEffect, useRef } from "react";
import { useVideoPlayer, type VideoPlayer } from "expo-video";

interface VideoEngineCallbacks {
    onTimeUpdate?: (positionSec: number, durationSec: number) => void;
    onPlayingChange?: (isPlaying: boolean) => void;
    onEnded?: () => void;
    onLoadStart?: () => void;
    onLoaded?: () => void;
}

export interface VideoEngineControls {
    player: VideoPlayer;
    attachVideo: (uri: string) => Promise<void>;
    detachVideo: () => void;
}

export function useVideoEngine(
    callbacks?: VideoEngineCallbacks
): VideoEngineControls {
    const callbacksRef = useRef(callbacks);
    useEffect(() => {
        callbacksRef.current = callbacks;
    });

    const videoPlayer = useVideoPlayer(null, (p) => {
        p.loop = false;
        p.muted = false;
        // Allow playback to continue when the app goes to background or
        // the screen is turned off.
        p.staysActiveInBackground = true;
    });

    useEffect(() => {
        const sub1 = videoPlayer.addListener("playingChange", ({ isPlaying }) => {
            callbacksRef.current?.onPlayingChange?.(isPlaying);
        });

        const sub2 = videoPlayer.addListener("timeUpdate", ({ currentTime }) => {
            const duration = videoPlayer.duration ?? 0;
            callbacksRef.current?.onTimeUpdate?.(currentTime, duration);
        });

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
            await videoPlayer.replaceAsync({ uri });
        },
        [videoPlayer]
    );

    const detachVideo = useCallback(() => {
        videoPlayer.pause();
    }, [videoPlayer]);

    return {
        player: videoPlayer,
        attachVideo,
        detachVideo,
    };
}
