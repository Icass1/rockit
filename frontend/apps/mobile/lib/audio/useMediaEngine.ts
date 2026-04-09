/**
 * useMediaEngine — Routes playback to the correct engine based on track type.
 *
 * Audio tracks  → useAudioEngine (expo-audio, background-capable)
 * Video tracks  → useVideoEngine (expo-video, handles audio+video, background-capable)
 *
 * No sync loop. Each engine manages its own state independently.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoPlayer } from "expo-video";
import { useAudioEngine } from "./useAudioEngine";
import type { CrossfadeSettings } from "./useAudioEngine";
import { useVideoEngine } from "./useVideoEngine";

export type MediaType = "audio" | "video";

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
    // Ref so callbacks inside the engines can read the current value
    // synchronously without waiting for a React re-render.
    const hasVideoRef = useRef(false);

    useEffect(() => {
        callbacksRef.current = callbacks;
    });

    const audioEngine = useAudioEngine({
        onTimeUpdate: (pos, dur) => {
            if (!hasVideoRef.current) callbacksRef.current.onTimeUpdate(pos, dur);
        },
        onPlayingChange: (playing) => {
            if (!hasVideoRef.current) callbacksRef.current.onPlayingChange(playing);
        },
        onEnded: () => {
            if (!hasVideoRef.current) callbacksRef.current.onEnded();
        },
        onAutoAdvance: () => {
            if (!hasVideoRef.current) callbacksRef.current.onAutoAdvance();
        },
        onLoadStart: () => {
            if (!hasVideoRef.current) callbacksRef.current.onLoadStart();
        },
        onLoaded: () => {
            if (!hasVideoRef.current) callbacksRef.current.onLoaded();
        },
        getNextUri: () => {
            if (hasVideoRef.current) return null;
            // Only preload if the next track is also audio
            if (callbacksRef.current.getNextType() === "audio") {
                return callbacksRef.current.getNextUri();
            }
            return null;
        },
    });

    const videoEngine = useVideoEngine({
        onTimeUpdate: (pos, dur) => {
            if (hasVideoRef.current) callbacksRef.current.onTimeUpdate(pos, dur);
        },
        onPlayingChange: (playing) => {
            if (hasVideoRef.current) callbacksRef.current.onPlayingChange(playing);
        },
        onEnded: () => {
            if (hasVideoRef.current) callbacksRef.current.onEnded();
        },
        onLoadStart: () => {
            if (hasVideoRef.current) callbacksRef.current.onLoadStart();
        },
        onLoaded: () => {
            if (hasVideoRef.current) callbacksRef.current.onLoaded();
        },
    });

    const loadTrack = useCallback(
        async (uri: string, shouldHaveVideo = false) => {
            // Update the routing ref first so any callbacks fired during loading
            // are already routed to the correct engine.
            hasVideoRef.current = shouldHaveVideo;

            if (shouldHaveVideo) {
                // Stop and unload the audio engine — expo-video will provide
                // the audio for this track.
                await audioEngine.unload();
                // Load the video source. expo-video fires statusChange events
                // which route onLoadStart / onLoaded through the callbacks above.
                await videoEngine.attachVideo(uri);
                videoEngine.player.play();
            } else {
                // Stop the video engine (fire-and-forget: just pauses).
                videoEngine.detachVideo();
                // Load and play via expo-audio.
                await audioEngine.loadAndPlay(uri, false);
            }

            setHasVideo(shouldHaveVideo);
        },
        [audioEngine, videoEngine]
    );

    const play = useCallback(async () => {
        if (hasVideoRef.current) {
            videoEngine.player.play();
        } else {
            await audioEngine.play();
        }
    }, [audioEngine, videoEngine]);

    const pause = useCallback(async () => {
        if (hasVideoRef.current) {
            videoEngine.player.pause();
        } else {
            await audioEngine.pause();
        }
    }, [audioEngine, videoEngine]);

    const seekTo = useCallback(
        async (seconds: number) => {
            if (hasVideoRef.current) {
                videoEngine.player.currentTime = seconds;
            } else {
                await audioEngine.seekTo(seconds);
            }
        },
        [audioEngine, videoEngine]
    );

    const setVolume = useCallback(
        (volume: number) => {
            if (hasVideoRef.current) {
                videoEngine.player.volume = Math.max(0, Math.min(1, volume));
            }
            // Audio engine volume is managed per-deck inside AudioCore.
        },
        [videoEngine]
    );

    const unload = useCallback(async () => {
        await audioEngine.unload();
        videoEngine.detachVideo();
        hasVideoRef.current = false;
        setHasVideo(false);
    }, [audioEngine, videoEngine]);

    return {
        hasVideo,
        videoPlayer: videoEngine.player,
        videoOpacity: hasVideo ? 1 : 0,
        loadTrack,
        play,
        pause,
        seekTo,
        setVolume,
        unload,
        updateCrossfadeSettings: audioEngine.updateCrossfadeSettings,
    };
}
