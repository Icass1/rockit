/**
 * useVideoEngine — Manages expo-video player for video media.
 * Exposes a VideoPlayer ref for rendering via VideoView in components.
 * Handles volume fade for cross-type transitions (audio↔video).
 */

import { useCallback, useEffect, useRef } from "react";
import { useVideoPlayer, type VideoPlayer } from "expo-video";

interface VideoEngineCallbacks {
    onTimeUpdate: (positionSec: number, durationSec: number) => void;
    onPlayingChange: (isPlaying: boolean) => void;
    onEnded: () => void;
    onLoadStart: () => void;
    onLoaded: () => void;
}

export interface VideoEngineControls {
    player: VideoPlayer;
    loadAndPlay: (uri: string) => void;
    play: () => void;
    pause: () => void;
    seekTo: (seconds: number) => void;
    setVolume: (volume: number) => void;
    unload: () => void;
}

export function useVideoEngine(
    callbacks: VideoEngineCallbacks
): VideoEngineControls {
    const callbacksRef = useRef(callbacks);
    useEffect(() => {
        callbacksRef.current = callbacks;
    });

    const player = useVideoPlayer("", (p) => {
        p.loop = false;
        p.volume = 1;
    });

    useEffect(() => {
        const sub1 = player.addListener("playingChange", ({ isPlaying }) => {
            callbacksRef.current.onPlayingChange(isPlaying);
        });

        const sub2 = player.addListener("timeUpdate", ({ currentTime }) => {
            const duration = player.duration ?? 0;
            callbacksRef.current.onTimeUpdate(currentTime, duration);
        });

        const sub3 = player.addListener("playToEnd", () => {
            callbacksRef.current.onEnded();
        });

        const sub4 = player.addListener("statusChange", ({ status }) => {
            if (status === "loading") {
                callbacksRef.current.onLoadStart();
            } else if (status === "readyToPlay") {
                callbacksRef.current.onLoaded();
            }
        });

        return () => {
            sub1.remove();
            sub2.remove();
            sub3.remove();
            sub4.remove();
        };
    }, [player]);

    const loadAndPlay = useCallback(
        (uri: string) => {
            player.replace({ uri });
            player.play();
        },
        [player]
    );

    const play = useCallback(() => {
        player.play();
    }, [player]);

    const pause = useCallback(() => {
        player.pause();
    }, [player]);

    const seekTo = useCallback(
        (seconds: number) => {
            player.currentTime = seconds;
        },
        [player]
    );

    const setVolume = useCallback(
        (volume: number) => {
            player.volume = Math.max(0, Math.min(1, volume));
        },
        [player]
    );

    const unload = useCallback(() => {
        player.pause();
        player.volume = 0;
    }, [player]);

    return {
        player,
        loadAndPlay,
        play,
        pause,
        seekTo,
        setVolume,
        unload,
    };
}
