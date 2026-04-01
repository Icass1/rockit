/**
 * useMediaEngine — Master hook that routes audio vs video to the right engine
 * and handles cross-type transitions (audio↔video) with fade.
 *
 * Transition matrix:
 *   audio→audio:  dual-deck crossfade via useAudioEngine ✓
 *   audio→video:  audio volume fade out → video opacity+volume fade in
 *   video→audio:  video volume fade out → audio plays, video opacity fades out
 *   video→video:  video volume fade out → new video fade in (opacity)
 */

import { useCallback, useRef, useState } from "react";
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
    activeType: MediaType;
    videoPlayer: VideoPlayer;
    videoOpacity: number;
    loadAndPlay: (
        uri: string,
        type: MediaType,
        useCrossfade?: boolean
    ) => Promise<void>;
    play: () => void;
    pause: () => void;
    seekTo: (seconds: number) => Promise<void>;
    setVolume: (volume: number) => void;
    unload: () => Promise<void>;
    updateCrossfadeSettings: (settings: Partial<CrossfadeSettings>) => void;
}

export function useMediaEngine(
    callbacks: MediaEngineCallbacks
): MediaEngineControls {
    const callbacksRef = useRef(callbacks);
    const [activeType, setActiveType] = useState<MediaType>("audio");
    const [videoOpacity, setVideoOpacity] = useState(0);
    const activeTypeRef = useRef<MediaType>("audio");
    const isFadingRef = useRef(false);

    const updateCallbacks = () => {
        callbacksRef.current = callbacks;
    };
    callbacksRef.current = callbacks;

    const audioEngine = useAudioEngine({
        onTimeUpdate: (pos, dur) => {
            if (activeTypeRef.current === "audio") {
                callbacksRef.current.onTimeUpdate(pos, dur);
            }
        },
        onPlayingChange: (playing) => {
            if (activeTypeRef.current === "audio") {
                callbacksRef.current.onPlayingChange(playing);
            }
        },
        onEnded: () => {
            if (activeTypeRef.current === "audio") {
                callbacksRef.current.onEnded();
            }
        },
        onAutoAdvance: () => {
            if (activeTypeRef.current === "audio") {
                callbacksRef.current.onAutoAdvance();
            }
        },
        onLoadStart: () => {
            if (activeTypeRef.current === "audio") {
                callbacksRef.current.onLoadStart();
            }
        },
        onLoaded: () => {
            if (activeTypeRef.current === "audio") {
                callbacksRef.current.onLoaded();
            }
        },
        getNextUri: () => {
            if (callbacksRef.current.getNextType() === "audio") {
                return callbacksRef.current.getNextUri();
            }
            return null;
        },
    });

    const videoEngine = useVideoEngine({
        onTimeUpdate: (pos, dur) => {
            if (activeTypeRef.current === "video") {
                callbacksRef.current.onTimeUpdate(pos, dur);
            }
        },
        onPlayingChange: (playing) => {
            if (activeTypeRef.current === "video") {
                callbacksRef.current.onPlayingChange(playing);
            }
        },
        onEnded: () => {
            if (activeTypeRef.current === "video") {
                callbacksRef.current.onEnded();
            }
        },
        onLoadStart: () => {
            if (activeTypeRef.current === "video") {
                callbacksRef.current.onLoadStart();
            }
        },
        onLoaded: () => {
            if (activeTypeRef.current === "video") {
                callbacksRef.current.onLoaded();
            }
        },
    });

    const fadeVolume = useCallback(
        (
            startVol: number,
            endVol: number,
            setVol: (v: number) => void
        ): Promise<void> => {
            return new Promise((resolve) => {
                const steps = Math.ceil(CROSS_FADE_DURATION_MS / FADE_TICK_MS);
                let step = 0;
                const interval = setInterval(() => {
                    step++;
                    const t = Math.min(step / steps, 1);
                    const vol = startVol + (endVol - startVol) * t;
                    setVol(vol);
                    if (step >= steps) {
                        clearInterval(interval);
                        resolve();
                    }
                }, FADE_TICK_MS);
            });
        },
        []
    );

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

    const loadAndPlay = useCallback(
        async (uri: string, type: MediaType, useCrossfade = false) => {
            const prev = activeTypeRef.current;
            const next = type;

            if (prev === next) {
                activeTypeRef.current = type;
                setActiveType(type);

                if (type === "audio") {
                    await audioEngine.loadAndPlay(uri, useCrossfade);
                } else {
                    if (useCrossfade && !isFadingRef.current) {
                        isFadingRef.current = true;
                        await Promise.all([
                            fadeOpacity(1, 0),
                            fadeVolume(1, 0, (v) => videoEngine.setVolume(v)),
                        ]);
                        videoEngine.loadAndPlay(uri);
                        await Promise.all([
                            fadeOpacity(0, 1),
                            fadeVolume(0, 1, (v) => videoEngine.setVolume(v)),
                        ]);
                        isFadingRef.current = false;
                    } else {
                        videoEngine.loadAndPlay(uri);
                        setVideoOpacity(1);
                    }
                }
                return;
            }

            isFadingRef.current = true;

            if (prev === "audio" && next === "video") {
                callbacksRef.current.onLoadStart();

                videoEngine.setVolume(0);
                setVideoOpacity(0);
                videoEngine.loadAndPlay(uri);

                await Promise.all([
                    fadeVolume(1, 0, async () => {}),
                    fadeOpacity(0, 1),
                    fadeVolume(0, 1, (v) => videoEngine.setVolume(v)),
                ]);

                audioEngine.pause();

                activeTypeRef.current = "video";
                setActiveType("video");
                callbacksRef.current.onLoaded();
            } else if (prev === "video" && next === "audio") {
                callbacksRef.current.onLoadStart();

                await audioEngine.loadAndPlay(uri, false);

                await Promise.all([
                    fadeOpacity(1, 0),
                    fadeVolume(1, 0, (v) => videoEngine.setVolume(v)),
                ]);

                videoEngine.pause();
                setVideoOpacity(0);
                videoEngine.setVolume(1);

                activeTypeRef.current = "audio";
                setActiveType("audio");
                callbacksRef.current.onLoaded();
            }

            isFadingRef.current = false;
        },
        [audioEngine, videoEngine, fadeOpacity, fadeVolume]
    );

    const play = useCallback(() => {
        if (activeTypeRef.current === "audio") {
            audioEngine.play();
        } else {
            videoEngine.play();
        }
    }, [audioEngine, videoEngine]);

    const pause = useCallback(() => {
        if (activeTypeRef.current === "audio") {
            audioEngine.pause();
        } else {
            videoEngine.pause();
        }
    }, [audioEngine, videoEngine]);

    const seekTo = useCallback(
        async (seconds: number) => {
            if (activeTypeRef.current === "audio") {
                await audioEngine.seekTo(seconds);
            } else {
                videoEngine.seekTo(seconds);
            }
        },
        [audioEngine, videoEngine]
    );

    const setVolume = useCallback(
        (volume: number) => {
            if (activeTypeRef.current === "video") {
                videoEngine.setVolume(volume);
            }
        },
        [audioEngine, videoEngine]
    );

    const unload = useCallback(async () => {
        await audioEngine.unload();
        videoEngine.unload();
    }, [audioEngine, videoEngine]);

    return {
        activeType,
        videoPlayer: videoEngine.player,
        videoOpacity,
        loadAndPlay,
        play,
        pause,
        seekTo,
        setVolume,
        unload,
        updateCrossfadeSettings: audioEngine.updateCrossfadeSettings,
    };
}
