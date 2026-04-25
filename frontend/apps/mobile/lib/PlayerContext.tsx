import {
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
import {
    API_ENDPOINTS,
    ERepeatMode,
    isVideo,
    QueueResponseSchema,
    SessionResponseSchema,
} from "@rockit/shared";
import type { VideoPlayer } from "expo-video";
import { apiFetch } from "@/lib/api";
import { getMediaByPublicId } from "@/lib/database";
import {
    AudioIntegrationService,
    type LockScreenMetadata,
} from "@/lib/audio/AudioIntegration";
import { mediaCacheManager } from "@/lib/audio/MediaCacheManager";
import type { CrossfadeSettings } from "@/lib/audio/useAudioEngine";
import { DEFAULT_CROSSFADE } from "@/lib/audio/useAudioEngine";
import { useMediaEngine } from "@/lib/audio/useMediaEngine";
import { useQueue } from "@/lib/audio/useQueue";
import { webSocketManager } from "@/lib/webSocketManager";

const WS_TIME_SYNC_INTERVAL_MS = 1000;

interface PlayerTimeContextType {
    currentTime: number;
    duration: number;
}

const PlayerTimeContext = createContext<PlayerTimeContextType>({
    currentTime: 0,
    duration: 0,
});

interface PlayerContextType {
    currentMedia: TQueueMedia | undefined;
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
    playNext: (media: TQueueMedia, newQueue: TQueueMedia[]) => Promise<void>;
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
    addToQueueEnd: (media: TQueueMedia | TQueueMedia[]) => void;
    addToQueueNext: (media: TQueueMedia | TQueueMedia[]) => void;
    showPlayer: () => void;
    hidePlayer: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

function hasVideoSource(
    media: BaseSongWithoutAlbumResponse | BaseVideoResponse | null
): boolean {
    if (!media) return false;
    return "videoSrc" in media && !!media.videoSrc;
}

function getLockScreenMetadata(
    media: TQueueMedia,
    duration: number
): LockScreenMetadata {
    return {
        title: media.name,
        artist: media.artists?.[0]?.name,
        albumTitle: "album" in media ? media.album?.name : undefined,
        artworkUrl: media.imageUrl,
        duration: duration > 0 ? duration : undefined,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (queue.currentMedia) {
            const metadata = getLockScreenMetadata(
                queue.currentMedia,
                duration
            );
            AudioIntegrationService.setLockScreenActive(true, metadata, {
                showSeekForward: true,
                showSeekBackward: true,
            });
        } else {
            AudioIntegrationService.setLockScreenActive(false);
        }
    }, [queue.currentMedia, duration]);

    useEffect(() => {
        AudioIntegrationService.updatePlaybackState(isPlaying, currentTime);
    }, [isPlaying, currentTime]);

    useEffect(() => {
        async function restoreSession() {
            try {
                const [queueResponse, sessionResponse] = await Promise.all([
                    apiFetch(API_ENDPOINTS.userQueue, QueueResponseSchema),
                    apiFetch(API_ENDPOINTS.userSession, SessionResponseSchema),
                ]);

                if (!queueResponse.isOk()) {
                    console.error(queueResponse.message, queueResponse.detail);
                    return;
                }

                if (!sessionResponse.isOk()) {
                    console.error(
                        sessionResponse.message,
                        sessionResponse.detail
                    );
                    return;
                }

                if (queueResponse.result.currentQueueMediaId === null) return;

                const currentItem = queueResponse.result.queue.find(
                    (item) =>
                        item.queueMediaId ===
                        queueResponse.result.currentQueueMediaId
                );
                if (!currentItem) return;

                const queueMedia = queueResponse.result.queue.map(
                    (item) => item.media
                );
                const currentMedia = currentItem.media;

                queue.setQueueAndPlay(currentMedia, queueMedia);

                const uri = getUri(currentMedia);
                if (!uri) return;

                await mediaEngine.loadTrack(uri, hasVideoSource(currentMedia));
                await mediaEngine.pause();

                if (sessionResponse.result.currentTimeMs !== null) {
                    await mediaEngine.seekTo(
                        sessionResponse.result.currentTimeMs / 1000
                    );
                }
            } catch {
                // No active session or queue — start fresh
            }
        }

        restoreSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getUri = (
        media: BaseSongWithoutAlbumResponse | BaseVideoResponse | undefined
    ): string | null => {
        if (!media) return null;
        if (isVideo(media)) {
            return media.audioSrc ?? media.videoSrc ?? null;
        }
        return media.audioSrc;
    };

    // Resolves the best URI for playback: local file → media cache → remote URL
    const resolveUri = async (media: TQueueMedia): Promise<string | null> => {
        try {
            const dbMedia = await getMediaByPublicId(media.publicId);
            if (dbMedia?.downloaded && dbMedia.localFilePath) {
                return dbMedia.localFilePath;
            }
        } catch {
            // Fall through to remote
        }
        const remoteUri = getUri(media);
        if (!remoteUri) return null;
        const cached = await mediaCacheManager.getCachedUri(
            remoteUri,
            media.publicId
        );
        return cached ?? remoteUri;
    };

    const mediaEngine = useMediaEngine({
        onTimeUpdate: (pos, dur) => {
            setCurrentTime(pos);
            currentTimeRef.current = pos;
            setDuration(dur);

            const now = Date.now();
            if (now - lastWsSyncTimeRef.current >= WS_TIME_SYNC_INTERVAL_MS) {
                lastWsSyncTimeRef.current = now;
                const mediaPublicId =
                    queueRef.current.currentMedia?.publicId ?? "";
                webSocketManager.sendCurrentTime({
                    currentTimeMs: Math.round(pos * 1000),
                    mediaPublicId,
                });
            }
        },
        onPlayingChange: setIsPlaying,
        onLoadStart: () => setIsLoading(true),
        onLoaded: () => setIsLoading(false),
        onDeletePreviousCache: async () => {
            // Delete the track that just finished (currentMedia before queue advances)
            const finishedMedia = queue.currentMedia;
            if (finishedMedia?.publicId) {
                const uri = getUri(finishedMedia);
                if (uri) {
                    await mediaCacheManager.deleteCached(uri);
                }
            }
        },
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
                const rawUri = getUri(nextMedia);
                if (rawUri) {
                    const nextHasVideo = hasVideoSource(nextMedia);
                    queueRef.current.setCurrentIndex(index);
                    resolveUri(nextMedia).then((playUri) => {
                        if (!playUri) return;
                        mediaEngine.loadTrack(playUri, nextHasVideo);
                        const isLocal = playUri !== rawUri;
                        if (!isLocal && !nextHasVideo) {
                            mediaCacheManager.downloadToCache(
                                rawUri,
                                nextMedia.publicId
                            );
                        }
                    });
                    webSocketManager.sendCurrentMedia({
                        mediaPublicId: nextMedia.publicId,
                        queueMediaId: index,
                    });
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
        getNextPublicId: () => {
            const nextIndex = queue.getNextIndex();
            if (nextIndex === null) return null;
            return queue.queue[nextIndex]?.publicId ?? null;
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
            const rawUri = getUri(media);
            const shouldHaveVideo = hasVideoSource(media);

            // Clean up the outgoing track's cache before switching
            const outgoingMedia = queue.currentMedia;
            if (outgoingMedia) {
                const outgoingUri = getUri(outgoingMedia);
                if (outgoingUri)
                    mediaCacheManager.deleteCached(outgoingUri);
            }

            const index = queue.setQueueAndPlay(media, newQueue);
            setCurrentTime(0);
            currentTimeRef.current = 0;
            setDuration(0);

            // Prefer local downloaded file, then media cache, then remote URL
            const playUri = await resolveUri(media);
            if (!playUri) return;
            await mediaEngine.loadTrack(playUri, shouldHaveVideo);
            // Seed background cache only when playing a remote URL (not a local file)
            const isLocal = !rawUri || playUri !== rawUri;
            if (!isLocal && !shouldHaveVideo && rawUri) {
                mediaCacheManager.downloadToCache(rawUri, media.publicId);
            }
            webSocketManager.sendMediaClicked({
                mediaPublicId: media.publicId,
            });
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
        const rawUri = getUri(nextMedia);
        if (!rawUri) return;
        const shouldHaveVideo = hasVideoSource(nextMedia);

        // Clean up the outgoing track's cache
        const outgoingMedia = queue.currentMedia;
        if (outgoingMedia) {
            const outgoingUri = getUri(outgoingMedia);
            if (outgoingUri) mediaCacheManager.deleteCached(outgoingUri);
        }

        queue.setCurrentIndex(nextIndex);
        setCurrentTime(0);
        const playUri = await resolveUri(nextMedia);
        if (!playUri) return;
        await mediaEngine.loadTrack(playUri, shouldHaveVideo);
        const isLocal = playUri !== rawUri;
        if (!isLocal && !shouldHaveVideo) {
            mediaCacheManager.downloadToCache(rawUri, nextMedia.publicId);
        }
        webSocketManager.sendCurrentMedia({
            mediaPublicId: nextMedia.publicId,
            queueMediaId: nextIndex,
        });
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
        const rawUri = getUri(prevMedia);
        if (!rawUri) return;
        const shouldHaveVideo = hasVideoSource(prevMedia);

        // Clean up the outgoing track's cache
        const outgoingMedia = queue.currentMedia;
        if (outgoingMedia) {
            const outgoingUri = getUri(outgoingMedia);
            if (outgoingUri) mediaCacheManager.deleteCached(outgoingUri);
        }

        queue.setCurrentIndex(prevIndex);
        setCurrentTime(0);
        const playUri = await resolveUri(prevMedia);
        if (!playUri) return;
        await mediaEngine.loadTrack(playUri, shouldHaveVideo);
        const isLocal = playUri !== rawUri;
        if (!isLocal && !shouldHaveVideo) {
            mediaCacheManager.downloadToCache(rawUri, prevMedia.publicId);
        }
        webSocketManager.sendCurrentMedia({
            mediaPublicId: prevMedia.publicId,
            queueMediaId: prevIndex,
        });
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
                playNext: queue.playNext,
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
                addToQueueEnd: queue.addToQueueEnd,
                addToQueueNext: queue.addToQueueNext,
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
