/**
 * useMediaEngine — Master hook that orchestrates audio vs video.
 *
 * ARCHITECTURE RULE: expo-audio is ALWAYS the playback master.
 * expo-video is ONLY a visual layer that syncs to audio state.
 *
 * - Audio-only track: uses only audioEngine
 * - Video track: audioEngine is master, videoEngine syncs to it
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoPlayer } from "expo-video";
import { useAudioEngine } from "./useAudioEngine";
import type { CrossfadeSettings } from "./useAudioEngine";
import { useVideoEngine } from "./useVideoEngine";

export type MediaType = "audio" | "video";

const CROSS_FADE_DURATION_MS = 400;
const FADE_TICK_MS = 16;

interface MediaEngineCallbacks {
    onTimeUpdate: (positionSec: number, durationSec: number) => void;
    onPlayingChange: (isPlaying: boolean) => void;
    onEnded: () => void;
    onAutoAdvance: () => void;
    onLoadStart: () => void;
    onLoaded: () => void;
    getNextUri: () => string | null;
    getNextType: () => MediaType;
}

export interface MediaEngineControls {
    hasVideo: boolean;
    videoPlayer: VideoPlayer | null;
    videoOpacity: number;
    loadTrack: (uri: string, hasVideo?: boolean) => Promise<void>;
    play: () => Promise<void>;
    pause: () => Promise<void>;
    seekTo: (seconds: number) => Promise<void>;
    setVolume: (volume: number) => void;
    unload: () => Promise<void>;
    updateCrossfadeSettings: (settings: Partial<CrossfadeSettings>) => void;
}

export function useMediaEngine(
    callbacks: MediaEngineCallbacks
): MediaEngineControls {
    const callbacksRef = useRef(callbacks);
    const [hasVideo, setHasVideo] = useState(false);
    const [videoOpacity, setVideoOpacity] = useState(0);
    const isFadingRef = useRef(false);
    const currentUriRef = useRef<string | null>(null);

    // Always update callbacks ref
    useEffect(() => {
        callbacksRef.current = callbacks;
    });

    // AUDIO ENGINE - always the master
    const audioEngine = useAudioEngine({
        onTimeUpdate: (pos, dur) => {
            callbacksRef.current.onTimeUpdate(pos, dur);
        },
        onPlayingChange: (playing) => {
            callbacksRef.current.onPlayingChange(playing);
        },
        onEnded: () => {
            callbacksRef.current.onEnded();
        },
        onAutoAdvance: () => {
            callbacksRef.current.onAutoAdvance();
        },
        onLoadStart: () => {
            callbacksRef.current.onLoadStart();
        },
        onLoaded: () => {
            callbacksRef.current.onLoaded();
        },
        getNextUri: () => {
            if (callbacksRef.current.getNextType() === "audio") {
                return callbacksRef.current.getNextUri();
            }
            return null;
        },
    });

    // VIDEO ENGINE - only for visual sync, never playback master
    const videoEngine = useVideoEngine();

    // SYNC: When hasVideo is true, sync video to audio state
    useEffect(() => {
        if (!hasVideo) return;

        // Sync loop - video follows audio
        const syncInterval = setInterval(() => {
            if (audioEngine.isPlayingRef) {
                videoEngine.syncToAudioState(
                    audioEngine.isPlayingRef.current,
                    audioEngine.currentTimeRef.current,
                    1
                );
            }
        }, 100);

        return () => {
            clearInterval(syncInterval);
        };
    }, [hasVideo]);

    const fadeOpacity = useCallback(
        (start: number, end: number): Promise<void> => {
            return new Promise((resolve) => {
                const steps = Math.ceil(CROSS_FADE_DURATION_MS / FADE_TICK_MS);
                let step = 0;
                const interval = setInterval(() => {
                    step++;
                    const t = Math.min(step / steps, 1);
                    setVideoOpacity(start + (end - start) * t);
                    if (step >= steps) {
                        clearInterval(interval);
                        resolve();
                    }
                }, FADE_TICK_MS);
            });
        },
        []
    );

    const loadTrack = useCallback(
        async (uri: string, shouldHaveVideo: boolean = false) => {
            const prevHasVideo = hasVideo;
            const nextHasVideo = shouldHaveVideo;

            // Clean up previous video if switching from video to audio
            if (prevHasVideo && !nextHasVideo) {
                await videoEngine.detachVideo();
                setVideoOpacity(0);
            }

            // Always load audio first (master)
            await audioEngine.loadAndPlay(uri, false);

            // Handle video if needed
            if (nextHasVideo) {
                if (!prevHasVideo) {
                    setVideoOpacity(0);
                }
                await videoEngine.attachVideo(uri);
                await fadeOpacity(prevHasVideo ? 1 : 0, 1);
            }

            currentUriRef.current = uri;
            setHasVideo(nextHasVideo);
        },
        [audioEngine, videoEngine, hasVideo, fadeOpacity]
    );

    const play = useCallback(async () => {
        await audioEngine.play();
    }, [audioEngine]);

    const pause = useCallback(async () => {
        await audioEngine.pause();
    }, [audioEngine]);

    const seekTo = useCallback(
        async (seconds: number) => {
            await audioEngine.seekTo(seconds);
        },
        [audioEngine]
    );

    const setVolume = useCallback(
        (volume: number) => {
            // Volume affects video visual, audio volume is handled by audioEngine
            if (hasVideo) {
                videoEngine.syncToAudioState(
                    audioEngine.isPlayingRef?.current ?? false,
                    audioEngine.currentTimeRef?.current ?? 0,
                    volume
                );
            }
        },
        [hasVideo, videoEngine, audioEngine]
    );

    const unload = useCallback(async () => {
        await audioEngine.unload();
        if (hasVideo) {
            await videoEngine.detachVideo();
        }
    }, [audioEngine, videoEngine, hasVideo]);

    return {
        hasVideo,
        videoPlayer: videoEngine.player,
        videoOpacity,
        loadTrack,
        play,
        pause,
        seekTo,
        setVolume,
        unload,
        updateCrossfadeSettings: audioEngine.updateCrossfadeSettings,
    };
}
