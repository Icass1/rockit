import React, { createContext, useCallback, useContext, useState } from "react";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { DEFAULT_CROSSFADE, useAudioEngine } from "@/lib/audio/useAudioEngine";
import type { CrossfadeSettings } from "@/lib/audio/useAudioEngine";
import { useQueue } from "@/lib/audio/useQueue";
import type { RepeatMode } from "@/lib/audio/useQueue";

interface PlayerContextType {
    currentMedia: BaseSongWithAlbumResponse | null;
    queue: BaseSongWithAlbumResponse[];
    currentIndex: number;
    isPlaying: boolean;
    isLoading: boolean;
    currentTime: number;
    duration: number;
    isPlayerVisible: boolean;
    shuffle: boolean;
    repeatMode: RepeatMode;
    crossfadeSettings: CrossfadeSettings;
    updateCrossfadeSettings: (s: Partial<CrossfadeSettings>) => void;

    playMedia: (
        media: BaseSongWithAlbumResponse,
        queue: BaseSongWithAlbumResponse[]
    ) => Promise<void>;
    pause: () => Promise<void>;
    play: () => Promise<void>;
    togglePlayPause: () => Promise<void>;
    seekTo: (seconds: number) => Promise<void>;
    skipForward: () => Promise<void>;
    skipBack: () => Promise<void>;
    toggleShuffle: () => void;
    cycleRepeat: () => void;
    removeFromQueue: (index: number) => void;
    reorderQueue: (fromIndex: number, toIndex: number) => void;
    showPlayer: () => void;
    hidePlayer: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlayerVisible, setIsPlayerVisible] = useState(false);
    const [crossfadeSettings, setCrossfadeSettings] =
        useState<CrossfadeSettings>(DEFAULT_CROSSFADE);

    const queue = useQueue();
    const engine = useAudioEngine({
        onTimeUpdate: (pos, dur) => {
            setCurrentTime(pos);
            setDuration(dur);
        },
        onPlayingChange: setIsPlaying,
        onLoadStart: () => setIsLoading(true),
        onLoaded: () => setIsLoading(false),
        getNextUri: () => {
            const nextIndex = queue.getNextIndex();
            if (nextIndex === null) return null;
            return queue.queue[nextIndex]?.audioSrc ?? null;
        },
        onEnded: () => {
            const { action, index } = queue.resolveOnEnd();
            if (action === "replay") {
                engine.seekTo(0).then(() => engine.play());
            } else if (action === "play" && index !== null) {
                const nextMedia = queue.queue[index];
                if (nextMedia?.audioSrc) {
                    queue.setCurrentIndex(index);
                    engine.loadAndPlay(nextMedia.audioSrc, true);
                }
            } else {
                setIsPlaying(false);
            }
        },
        onAutoAdvance: () => {
            const { index } = queue.resolveOnEnd();
            if (index !== null) {
                queue.setCurrentIndex(index);
                setCurrentTime(0);
                setDuration(0);
            }
        },
    });

    const playMedia = useCallback(
        async (
            media: BaseSongWithAlbumResponse,
            newQueue: BaseSongWithAlbumResponse[]
        ) => {
            if (!media.audioSrc) {
                return;
            }
            queue.setQueueAndPlay(media, newQueue);
            setCurrentTime(0);
            setDuration(0);
            await engine.loadAndPlay(media.audioSrc, false);
            setIsPlayerVisible(true);
        },
        [engine, queue]
    );

    const play = useCallback(async () => {
        await engine.play();
        setIsPlaying(true);
    }, [engine]);

    const pause = useCallback(async () => {
        await engine.pause();
        setIsPlaying(false);
    }, [engine]);

    const togglePlayPause = useCallback(async () => {
        if (isPlaying) {
            await pause();
        } else {
            await play();
        }
    }, [isPlaying, play, pause]);

    const seekTo = useCallback(
        async (seconds: number) => {
            await engine.seekTo(seconds);
            setCurrentTime(seconds);
        },
        [engine]
    );

    const skipForward = useCallback(async () => {
        const nextIndex = queue.getNextIndex();
        if (nextIndex === null) return;
        const nextMedia = queue.queue[nextIndex];
        if (!nextMedia?.audioSrc) return;
        queue.setCurrentIndex(nextIndex);
        setCurrentTime(0);
        await engine.loadAndPlay(nextMedia.audioSrc, true);
    }, [engine, queue]);

    const skipBack = useCallback(async () => {
        if (currentTime > 3) {
            await seekTo(0);
            return;
        }
        const prevIndex = queue.getPrevIndex();
        if (prevIndex === null) {
            await seekTo(0);
            return;
        }
        const prevMedia = queue.queue[prevIndex];
        if (!prevMedia?.audioSrc) return;
        queue.setCurrentIndex(prevIndex);
        setCurrentTime(0);
        await engine.loadAndPlay(prevMedia.audioSrc, true);
    }, [currentTime, engine, queue, seekTo]);

    const showPlayer = useCallback(() => setIsPlayerVisible(true), []);
    const hidePlayer = useCallback(() => setIsPlayerVisible(false), []);

    const updateCrossfadeSettings = useCallback(
        (settings: Partial<CrossfadeSettings>) => {
            engine.updateCrossfadeSettings(settings);
            setCrossfadeSettings((prev) => ({ ...prev, ...settings }));
        },
        [engine]
    );

    return (
        <PlayerContext.Provider
            value={{
                currentMedia: queue.currentMedia,
                queue: queue.queue,
                currentIndex: queue.currentIndex,
                isPlaying,
                isLoading,
                currentTime,
                duration,
                isPlayerVisible,
                shuffle: queue.shuffle,
                repeatMode: queue.repeatMode,
                crossfadeSettings,
                updateCrossfadeSettings,
                playMedia,
                pause,
                play,
                togglePlayPause,
                seekTo,
                skipForward,
                skipBack,
                toggleShuffle: queue.toggleShuffle,
                cycleRepeat: queue.cycleRepeat,
                removeFromQueue: queue.removeFromQueue,
                reorderQueue: queue.reorderQueue,
                showPlayer,
                hidePlayer,
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer(): PlayerContextType {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
    return ctx;
}

export type { RepeatMode };
