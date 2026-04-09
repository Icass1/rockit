import React, { createContext, useCallback, useContext, useState } from "react";
import type {
    BaseSongWithoutAlbumResponse,
    BaseVideoResponse,
    TQueueMedia,
} from "@rockit/shared";
import { ERepeatMode } from "@rockit/shared";
import type { VideoPlayer } from "expo-video";
import { DEFAULT_CROSSFADE } from "@/lib/audio/useAudioEngine";
import type { CrossfadeSettings } from "@/lib/audio/useAudioEngine";
import { useMediaEngine } from "@/lib/audio/useMediaEngine";
import { useQueue } from "@/lib/audio/useQueue";

interface PlayerContextType {
    currentMedia: TQueueMedia | null;
    queue: TQueueMedia[];
    currentIndex: number;
    isPlaying: boolean;
    isLoading: boolean;
    currentTime: number;
    duration: number;
    isPlayerVisible: boolean;
    shuffle: boolean;
    repeatMode: ERepeatMode;
    crossfadeSettings: CrossfadeSettings;
    updateCrossfadeSettings: (s: Partial<CrossfadeSettings>) => void;
    videoPlayer: VideoPlayer | null;
    videoOpacity: number;
    hasVideo: boolean;

    playMedia: (media: TQueueMedia, queue: TQueueMedia[]) => Promise<void>;
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

function hasVideoSource(
    media: BaseSongWithoutAlbumResponse | BaseVideoResponse | null
): boolean {
    if (!media) return false;
    return !!(media as any).videoSrc;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlayerVisible, setIsPlayerVisible] = useState(false);
    const [crossfadeSettings, setCrossfadeSettings] =
        useState<CrossfadeSettings>(DEFAULT_CROSSFADE);

    const queue = useQueue();

    const getUri = (
        media: BaseSongWithoutAlbumResponse | BaseVideoResponse | undefined
    ): string | null => {
        if (!media) return null;
        return (media as any).audioSrc ?? (media as any).videoSrc ?? null;
    };

    const mediaEngine = useMediaEngine({
        onTimeUpdate: (pos, dur) => {
            setCurrentTime(pos);
            setDuration(dur);
        },
        onPlayingChange: setIsPlaying,
        onLoadStart: () => setIsLoading(true),
        onLoaded: () => setIsLoading(false),
        onEnded: () => {
            const { action, index } = queue.resolveOnEnd();
            if (action === "replay") {
                mediaEngine.seekTo(0).then(() => mediaEngine.play());
            } else if (action === "play" && index !== null) {
                const nextMedia = queue.queue[index];
                const uri = getUri(nextMedia);
                if (uri) {
                    const nextHasVideo = hasVideoSource(nextMedia);
                    queue.setCurrentIndex(index);
                    mediaEngine.loadTrack(uri, nextHasVideo);
                }
            } else {
                setIsPlaying(false);
            }
        },
        onAutoAdvance: () => {
            const nextIdx = queue.getNextIndex();
            if (nextIdx !== null) queue.setCurrentIndex(nextIdx);
        },
        getNextUri: () => {
            const nextIndex = queue.getNextIndex();
            if (nextIndex === null) return null;
            return getUri(queue.queue[nextIndex]);
        },
        getNextType: () => {
            const nextIndex = queue.getNextIndex();
            if (nextIndex === null) return "audio";
            return hasVideoSource(queue.queue[nextIndex] ?? null)
                ? "video"
                : "audio";
        },
    });

    const playMedia = useCallback(
        async (media: TQueueMedia, newQueue: TQueueMedia[]) => {
            const uri = getUri(media);
            if (!uri) return;
            const shouldHaveVideo = hasVideoSource(media);
            queue.setQueueAndPlay(media, newQueue);
            setCurrentTime(0);
            setDuration(0);
            await mediaEngine.loadTrack(uri, shouldHaveVideo);
            setIsPlayerVisible(true);
        },
        [mediaEngine, queue]
    );

    const play = useCallback(async () => {
        mediaEngine.play();
        setIsPlaying(true);
    }, [mediaEngine]);

    const pause = useCallback(async () => {
        mediaEngine.pause();
        setIsPlaying(false);
    }, [mediaEngine]);

    const togglePlayPause = useCallback(async () => {
        if (isPlaying) {
            await pause();
        } else {
            await play();
        }
    }, [isPlaying, play, pause]);

    const seekTo = useCallback(
        async (seconds: number) => {
            await mediaEngine.seekTo(seconds);
            setCurrentTime(seconds);
        },
        [mediaEngine]
    );

    const skipForward = useCallback(async () => {
        const nextIndex = queue.getNextIndex();
        if (nextIndex === null) return;
        const nextMedia = queue.queue[nextIndex];
        const uri = getUri(nextMedia);
        if (!uri) return;
        const shouldHaveVideo = hasVideoSource(nextMedia);
        queue.setCurrentIndex(nextIndex);
        setCurrentTime(0);
        await mediaEngine.loadTrack(uri, shouldHaveVideo);
    }, [mediaEngine, queue]);

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
        const uri = getUri(prevMedia);
        if (!uri) return;
        const shouldHaveVideo = hasVideoSource(prevMedia);
        queue.setCurrentIndex(prevIndex);
        setCurrentTime(0);
        await mediaEngine.loadTrack(uri, shouldHaveVideo);
    }, [currentTime, mediaEngine, queue, seekTo]);

    const showPlayer = useCallback(() => setIsPlayerVisible(true), []);
    const hidePlayer = useCallback(() => setIsPlayerVisible(false), []);

    const updateCrossfadeSettings = useCallback(
        (settings: Partial<CrossfadeSettings>) => {
            mediaEngine.updateCrossfadeSettings(settings);
            setCrossfadeSettings((prev) => ({ ...prev, ...settings }));
        },
        [mediaEngine]
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
                videoPlayer: mediaEngine.videoPlayer,
                videoOpacity: mediaEngine.videoOpacity,
                hasVideo: mediaEngine.hasVideo,
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
