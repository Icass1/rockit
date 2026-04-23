import { useCallback, useEffect, useMemo, useRef } from "react";
import type { AudioStatus } from "expo-audio";
import { AudioCore } from "./AudioCore";
import { AudioCrossfade } from "./AudioCrossfade";
import type { CrossfadeEffect } from "./AudioCrossfade";
import { AudioPreloader } from "./AudioPreloader";

export interface CrossfadeSettings {
    durationMs: number;
    effect: CrossfadeEffect;
    skipDurationMs: number;
}

export const DEFAULT_CROSSFADE: CrossfadeSettings = {
    durationMs: 0,
    effect: "equal_power",
    skipDurationMs: 300,
};

interface AudioEngineCallbacks {
    onTimeUpdate: (positionSec: number, durationSec: number) => void;
    onPlayingChange: (isPlaying: boolean) => void;
    onEnded: () => void;
    onAutoAdvance: () => void;
    onLoadStart: () => void;
    onLoaded: () => void;
    onDeletePreviousCache: () => void;
    getNextUri: () => string | null;
    getNextPublicId: () => string | null;
}

export interface AudioEngineControls {
    loadAndPlay: (uri: string, useCrossfade?: boolean) => Promise<void>;
    play: () => Promise<void>;
    pause: () => Promise<void>;
    seekTo: (seconds: number) => Promise<void>;
    unload: () => Promise<void>;
    updateCrossfadeSettings: (settings: Partial<CrossfadeSettings>) => void;
    // State getters for sync - exposed as refs
    isPlayingRef: React.MutableRefObject<boolean>;
    currentTimeRef: React.MutableRefObject<number>;
    durationRef: React.MutableRefObject<number>;
}

export function useAudioEngine(
    callbacks: AudioEngineCallbacks
): AudioEngineControls {
    const callbacksRef = useRef(callbacks);
    const crossfadeSettingsRef = useRef<CrossfadeSettings>({
        ...DEFAULT_CROSSFADE,
    });

    // State for sync with video engine
    const isPlayingRef = useRef(false);
    const currentTimeRef = useRef(0);
    const durationRef = useRef(0);

    useEffect(() => {
        callbacksRef.current = callbacks;
    });

    const core = useMemo(() => new AudioCore(), []);
    const crossfader = useMemo(() => new AudioCrossfade(core), [core]);
    const preloader = useMemo(() => new AudioPreloader(core), [core]);

    useEffect(() => {
        core.setStatusCallback((deckId, status: AudioStatus) => {
            if (deckId !== core.activeDeck) return;
            if (!status.currentTime && !status.duration) return;

            const positionSec = status.currentTime ?? 0;
            const durationSec = status.duration ?? 0;

            // Update refs for sync
            isPlayingRef.current = status.playing ?? false;
            currentTimeRef.current = positionSec;
            durationRef.current = durationSec;

            callbacksRef.current.onTimeUpdate(positionSec, durationSec);
            callbacksRef.current.onPlayingChange(status.playing ?? false);

            const nextUri = callbacksRef.current.getNextUri();
            const nextPublicId = callbacksRef.current.getNextPublicId();
            preloader.onTimeUpdate(
                positionSec,
                durationSec,
                nextUri,
                nextPublicId
            );

            if (status.didJustFinish) {
                callbacksRef.current.onDeletePreviousCache();
                const settings = crossfadeSettingsRef.current;

                if (settings.durationMs > 0) {
                    const uri = callbacksRef.current.getNextUri();
                    if (uri && preloader.isPreloaded(uri)) {
                        callbacksRef.current.onAutoAdvance();
                        crossfader
                            .crossfade({
                                durationMs: settings.durationMs,
                                effect: settings.effect,
                            })
                            .then(() => {
                                preloader.reset();
                            });
                    } else {
                        callbacksRef.current.onEnded();
                    }
                } else {
                    callbacksRef.current.onEnded();
                }
            }
        });
    }, [core, crossfader, preloader]);

    const unload = useCallback(async () => {
        await core.unloadAll();
        preloader.reset();
    }, [core, preloader]);

    const loadAndPlay = useCallback(
        async (uri: string, useCrossfade = false) => {
            callbacksRef.current.onLoadStart();
            const settings = crossfadeSettingsRef.current;

            if (useCrossfade && settings.skipDurationMs > 0) {
                if (preloader.isPreloaded(uri)) {
                    await crossfader.crossfade({
                        durationMs: settings.skipDurationMs,
                        effect: "linear",
                    });
                } else {
                    await core.loadIntoDeck(core.inactiveDeck, uri);
                    await crossfader.crossfade({
                        durationMs: settings.skipDurationMs,
                        effect: "linear",
                    });
                }
            } else {
                await core.unloadDeck(core.activeDeck);
                await core.loadIntoDeck(core.activeDeck, uri);
                await core.setVolumeDeck(core.activeDeck, 1);
                await core.playDeck(core.activeDeck);
            }

            callbacksRef.current.onLoaded();
        },
        [core, crossfader, preloader]
    );

    const play = useCallback(async () => {
        await core.playDeck(core.activeDeck);
    }, [core]);

    const pause = useCallback(async () => {
        await core.pauseDeck(core.activeDeck);
    }, [core]);

    const seekTo = useCallback(
        async (seconds: number) => {
            await core.seekDeck(core.activeDeck, seconds);
        },
        [core]
    );

    const updateCrossfadeSettings = useCallback(
        (settings: Partial<CrossfadeSettings>) => {
            crossfadeSettingsRef.current = {
                ...crossfadeSettingsRef.current,
                ...settings,
            };
        },
        []
    );

    useEffect(() => {
        return () => {
            core.unloadAll();
        };
    }, [core]);

    return {
        loadAndPlay,
        play,
        pause,
        seekTo,
        unload,
        updateCrossfadeSettings,
        // Expose refs for video sync
        isPlayingRef,
        currentTimeRef,
        durationRef,
    };
}
