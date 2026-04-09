import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import type {
    BaseSongWithoutAlbumResponse,
    BaseVideoResponse,
    TQueueMedia,
} from "@rockit/shared";
import { ERepeatMode } from "@rockit/shared";
import type { VideoPlayer } from "expo-video";
import {
    AudioIntegrationService,
    type LockScreenMetadata,
} from "@/lib/audio/AudioIntegration";
import type { CrossfadeSettings } from "@/lib/audio/useAudioEngine";
import { DEFAULT_CROSSFADE } from "@/lib/audio/useAudioEngine";
import { useMediaEngine } from "@/lib/audio/useMediaEngine";
import { useQueue } from "@/lib/audio/useQueue";
import { webSocketManager } from "@/lib/webSocketManager";

const WS_TIME_SYNC_INTERVAL_MS = 5000;

interface PlayerTimeContextType {
    currentTime: number;
    duration: number;
}

const PlayerTimeContext = createContext<PlayerTimeContextType>({
    currentTime: 0,
    duration: 0,
});

interface PlayerContextType {
    currentMedia: TQueueMedia | null;
    queue: TQueueMedia[];
    currentIndex: number;
    isPlaying: boolean;
    isLoading: boolean;
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

function getLockScreenMetadata(media: TQueueMedia): LockScreenMetadata {
    return {
        title: media.name,
        artist: media.artists?.[0]?.name,
        albumTitle: "album" in media ? (media as any).album?.name : undefined,
        artworkUrl: media.imageUrl,
    };
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
    const audioIntegrationInitialized = useRef(false);
    const lastWsSyncTimeRef = useRef(0);
    const currentTimeRef = useRef(0);
    const queueRef = useRef(queue);
    queueRef.current = queue;

    useEffect(() => {
        if (!audioIntegrationInitialized.current) {
            audioIntegrationInitialized.current = true;
            AudioIntegrationService.setCallbacks({
                onPlay: () => {
                    play();
                },
                onPause: () => {
                    pause();
                },
                onSeekForward: (seconds) => {
                    seekTo(currentTime + seconds);
                },
                onSeekBackward: (seconds) => {
                    seekTo(Math.max(0, currentTime - seconds));
                },
                onNextTrack: () => {
                    skipForward();
                },
                onPreviousTrack: () => {
                    skipBack();
                },
                onBluetoothConnect: () => {
                    if (!isPlaying && queue.currentMedia) {
                        play();
                    }
                },
                onBluetoothDisconnect: () => {
                    // Optionally pause when Bluetooth disconnects
                },
                onHeadsetConnect: () => {
                    if (!isPlaying && queue.currentMedia) {
                        play();
                    }
                },
                onHeadsetDisconnect: () => {
                    // Optionally pause when headset disconnects
                },
            });
        }
    }, []);

    useEffect(() => {
        if (isPlayerVisible && queue.currentMedia) {
            const metadata = getLockScreenMetadata(queue.currentMedia);
            AudioIntegrationService.setLockScreenActive(true, metadata, {
                showSeekForward: true,
                showSeekBackward: true,
            });
        } else {
            AudioIntegrationService.setLockScreenActive(false);
        }
    }, [queue.currentMedia, isPlayerVisible]);

    useEffect(() => {
        AudioIntegrationService.updatePlaybackState(isPlaying);
    }, [isPlaying]);

    const getUri = (
        media: BaseSongWithoutAlbumResponse | BaseVideoResponse | undefined
    ): string | null => {
        if (!media) return null;
        return (media as any).audioSrc ?? (media as any).videoSrc ?? null;
    };

    const mediaEngine = useMediaEngine({
        onTimeUpdate: (pos, dur) => {
            setCurrentTime(pos);
            currentTimeRef.current = pos;
            setDuration(dur);

            const now = Date.now();
            if (now - lastWsSyncTimeRef.current >= WS_TIME_SYNC_INTERVAL_MS) {
                lastWsSyncTimeRef.current = now;
                webSocketManager.sendCurrentTime({ currentTime: pos });
            }
        },
        onPlayingChange: setIsPlaying,
        onLoadStart: () => setIsLoading(true),
        onLoaded: () => setIsLoading(false),
        onEnded: () => {
            const currentMedia = queueRef.current.currentMedia;
            if (currentMedia) {
                webSocketManager.sendMediaEnded({
                    mediaPublicId: currentMedia.publicId,
                });
            }

            const { action, index } = queueRef.current.resolveOnEnd();
            if (action === "replay") {
                mediaEngine.seekTo(0).then(() => mediaEngine.play());
            } else if (action === "play" && index !== null) {
                const nextMedia = queueRef.current.queue[index];
                const uri = getUri(nextMedia);
                if (uri) {
                    const nextHasVideo = hasVideoSource(nextMedia);
                    queueRef.current.setCurrentIndex(index);
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
            const index = queue.setQueueAndPlay(media, newQueue);
            setCurrentTime(0);
            currentTimeRef.current = 0;
            setDuration(0);
            await mediaEngine.loadTrack(uri, shouldHaveVideo);
            webSocketManager.sendMediaClicked({ mediaPublicId: media.publicId });
            webSocketManager.sendCurrentMedia({
                mediaPublicId: media.publicId,
                queueMediaId: index,
            });
            webSocketManager.sendCurrentQueue({
                queue: newQueue.map((m, i) => ({
                    publicId: m.publicId,
                    queueMediaId: i,
                })),
                queueType: queue.shuffle ? "RANDOM" : "SORTED",
            });
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
            <PlayerTimeContext.Provider value={{ currentTime, duration }}>
                {children}
            </PlayerTimeContext.Provider>
        </PlayerContext.Provider>
    );
}

export function usePlayer(): PlayerContextType {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
    return ctx;
}

export function usePlayerTime(): PlayerTimeContextType {
    return useContext(PlayerTimeContext);
}
