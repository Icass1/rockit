import { useCallback, useEffect, useRef } from "react";
import { Audio, AVPlaybackStatus } from "expo-av";

interface AudioEngineCallbacks {
    onTimeUpdate: (positionSec: number, durationSec: number) => void;
    onPlayingChange: (isPlaying: boolean) => void;
    onEnded: () => void;
    onLoadStart: () => void;
    onLoaded: () => void;
}

export interface AudioEngineControls {
    loadAndPlay: (uri: string) => Promise<void>;
    play: () => Promise<void>;
    pause: () => Promise<void>;
    seekTo: (seconds: number) => Promise<void>;
    unload: () => Promise<void>;
}

export function useAudioEngine(
    callbacks: AudioEngineCallbacks
): AudioEngineControls {
    const soundRef = useRef<Audio.Sound | null>(null);
    const callbacksRef = useRef(callbacks);

    useEffect(() => {
        callbacksRef.current = callbacks;
    });

    const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;

        const positionSec = status.positionMillis / 1000;
        const durationSec = status.durationMillis
            ? status.durationMillis / 1000
            : 0;

        callbacksRef.current.onTimeUpdate(positionSec, durationSec);
        callbacksRef.current.onPlayingChange(status.isPlaying);

        if (status.didJustFinish) {
            callbacksRef.current.onEnded();
        }
    }, []);

    const unload = useCallback(async () => {
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }
    }, []);

    const loadAndPlay = useCallback(
        async (uri: string) => {
            callbacksRef.current.onLoadStart();
            await unload();

            const { sound } = await Audio.Sound.createAsync(
                { uri },
                {
                    shouldPlay: true,
                    progressUpdateIntervalMillis: 500,
                    pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
                },
                onPlaybackStatusUpdate
            );

            soundRef.current = sound;
            callbacksRef.current.onLoaded();
        },
        [unload, onPlaybackStatusUpdate]
    );

    const play = useCallback(async () => {
        await soundRef.current?.playAsync();
    }, []);

    const pause = useCallback(async () => {
        await soundRef.current?.pauseAsync();
    }, []);

    const seekTo = useCallback(async (seconds: number) => {
        await soundRef.current?.setPositionAsync(seconds * 1000);
    }, []);

    useEffect(() => {
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            interruptionModeIOS: 1,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: 1,
            playThroughEarpieceAndroid: false,
        });

        return () => {
            soundRef.current?.unloadAsync();
        };
    }, []);

    return { loadAndPlay, play, pause, seekTo, unload };
}
