import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import type {
    CurrentQueueMessageRequestItem,
    QueueResponseItem,
    TQueueMedia,
} from "@rockit/shared";
import {
    EQueueType,
    ERepeatMode,
    getMediaArtists,
    getMediaDuration,
    getMediaSubtitle,
    isVideo,
} from "@rockit/shared";
import type { VideoPlayer } from "expo-video";
import {
    AudioIntegrationService,
    type LockScreenMetadata,
} from "@/lib/audio/AudioIntegration";
import { mediaCacheManager } from "@/lib/audio/MediaCacheManager";
import {
    NativeMediaBridge,
    type AutoQueueItem,
} from "@/lib/audio/NativeMediaBridge";
import type { CrossfadeSettings } from "@/lib/audio/useAudioEngine";
import { DEFAULT_CROSSFADE } from "@/lib/audio/useAudioEngine";
import { useMediaEngine } from "@/lib/audio/useMediaEngine";
import { useQueue } from "@/lib/audio/useQueue";
import { Http } from "@/lib/http";
import { mediaStorage } from "@/lib/storage/mediaStorage";
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
    originalQueue: TQueueMedia[];
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

function hasVideoSource(media: TQueueMedia | null | undefined): boolean {
    if (!media) return false;
    return "videoSrc" in media && !!media.videoSrc;
}

function getLockScreenMetadata(
    media: TQueueMedia,
    duration: number
): LockScreenMetadata {
    return {
        title: media.name,
        artist: getMediaArtists(media)
            .map((artist) => artist.name)
            .join(", "),
        albumTitle: getMediaSubtitle(media),
        artworkUrl: media.imageUrl,
        duration: getMediaDuration(media),
    };
}

function buildQueuePayload(
    currentQueue: TQueueMedia[],
    originalQueue: TQueueMedia[],
    isShuffle: boolean,
    listPublicIdByMediaPublicId?: Map<string, string | null>
): CurrentQueueMessageRequestItem[] {
    const getListPublicId = (publicId: string): string | null =>
        listPublicIdByMediaPublicId?.get(publicId) ?? null;

    if (!isShuffle || originalQueue.length === 0) {
        return currentQueue.map((m, i) => ({
            mediaPublicId: m.publicId,
            listPublicId: getListPublicId(m.publicId),
            queueMediaId: i,
            sortedIndex: i,
            randomIndex: i,
        }));
    }
    // currentQueue is the random order; originalQueue is the sorted order
    // Build a map from publicId to all its positions (handles duplicates)
    const sortedIndexMap = new Map<string, number[]>();
    originalQueue.forEach((m, i) => {
        const indices = sortedIndexMap.get(m.publicId) ?? [];
        indices.push(i);
        sortedIndexMap.set(m.publicId, indices);
    });
    return currentQueue.map((m, i) => {
        const indices = sortedIndexMap.get(m.publicId);
        const sortedIndex = indices?.shift() ?? i;
        return {
            mediaPublicId: m.publicId,
            listPublicId: getListPublicId(m.publicId),
            queueMediaId: i,
            sortedIndex,
            randomIndex: i,
        };
    });
}

async function isMediaDownloaded(publicId: string): Promise<boolean> {
    try {
        const [songUri, videoUri] = await Promise.all([
            mediaStorage.getSongUri(publicId),
            mediaStorage.getVideoUri(publicId),
        ]);
        return !!(songUri || videoUri);
    } catch {
        return false;
    }
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
    const listPublicIdByMediaPublicIdRef = useRef<Map<string, string | null>>(
        new Map()
    );
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
            // Keep Android Auto in sync with the current track
            NativeMediaBridge.updateNowPlaying(
                queue.currentMedia.name,
                getMediaArtists(queue.currentMedia)
                    .map((artist) => artist.name)
                    .join(", "),
                getMediaSubtitle(queue.currentMedia),
                queue.currentMedia.imageUrl,
                getMediaDuration(queue.currentMedia)
            );
        } else {
            AudioIntegrationService.setLockScreenActive(false);
        }
    }, [queue.currentMedia, duration]);

    useEffect(() => {
        AudioIntegrationService.updatePlaybackState(isPlaying, currentTime);
        NativeMediaBridge.updatePlaybackState(
            isPlaying,
            Math.round(currentTime * 1000)
        );
    }, [isPlaying, currentTime]);

    // Sync queue to Android Auto MediaBrowserService
    useEffect(() => {
        const autoQueue: AutoQueueItem[] = queue.queue.map((m) => ({
            mediaId: m.publicId,
            title: m.name,
            artist: getMediaArtists(m)
                .map((artist) => artist.name)
                .join(", "),
            album: getMediaSubtitle(m),
            artworkUrl: m.imageUrl,
            duration: getMediaDuration(m) ?? 0,
        }));
        NativeMediaBridge.updateQueue(autoQueue, queue.currentIndex);
    }, [queue.queue, queue.currentIndex]);

    // Wire Android Auto transport commands to player actions
    useEffect(() => {
        NativeMediaBridge.setup({
            onBluetoothConnected: () => {
                if (!isPlaying && queue.currentMedia) play();
            },
            onBluetoothDisconnected: () => {},
            onAutoPlay: () => play(),
            onAutoPause: () => pause(),
            onAutoNext: () => skipForward(),
            onAutoPrevious: () => skipBack(),
            onAutoSeekTo: (seconds) => seekTo(seconds),
            onAutoSkipToIndex: (index) => {
                const target = queue.queue[index];
                if (target) {
                    const sortedQueue =
                        queue.shuffle && queue.originalQueue.length > 0
                            ? queue.originalQueue
                            : queue.queue;
                    playMedia(target, sortedQueue);
                }
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, queue.currentMedia, queue.queue]);

    useEffect(() => {
        async function restoreSession() {
            try {
                const [queueResponse, sessionResponse] = await Promise.all([
                    Http.getQueue(),
                    Http.getSession(),
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
                    (item: QueueResponseItem) =>
                        item.queueMediaId ===
                        queueResponse.result.currentQueueMediaId
                );
                if (!currentItem) return;

                const isShuffle = queueResponse.result.queueType === "RANDOM";
                const listPublicIdMap = new Map<string, string | null>();
                const sortedQueue = [...queueResponse.result.queue]
                    .sort(
                        (a: QueueResponseItem, b: QueueResponseItem) =>
                            a.sortedIndex - b.sortedIndex
                    )
                    .map((item: QueueResponseItem) => {
                        listPublicIdMap.set(
                            item.media.publicId,
                            item.listPublicId
                        );
                        return item.media;
                    });
                const randomQueue = [...queueResponse.result.queue]
                    .sort(
                        (a: QueueResponseItem, b: QueueResponseItem) =>
                            a.randomIndex - b.randomIndex
                    )
                    .map((item: QueueResponseItem) => item.media);
                listPublicIdByMediaPublicIdRef.current = listPublicIdMap;
                const currentMedia = currentItem.media;

                queue.restoreQueue(
                    sortedQueue,
                    randomQueue,
                    currentMedia,
                    isShuffle
                );

                const repeatMode =
                    ERepeatMode[sessionResponse.result.repeatMode];
                if (repeatMode !== undefined) {
                    queue.setRepeatMode(repeatMode);
                }

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

    const getUri = (media: TQueueMedia | undefined): string | null => {
        if (!media) return null;
        if (isVideo(media)) {
            return media.audioSrc ?? media.videoSrc ?? null;
        }
        if ("audioSrc" in media) {
            return media.audioSrc;
        }
        return null;
    };

    // Resolves the best URI for playback: local file → media cache → remote URL
    const resolveUri = async (media: TQueueMedia): Promise<string | null> => {
        try {
            const localUri = await mediaStorage.getSongUri(media.publicId);
            if (localUri) return localUri;
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
                (async () => {
                    const q = queueRef.current.queue;
                    let idx = index;
                    let checked = 0;

                    while (checked < q.length) {
                        if (idx >= q.length) idx = 0;

                        const media = q[idx];
                        const rawUri = getUri(media);
                        if (rawUri) {
                            const downloaded = await isMediaDownloaded(
                                media.publicId
                            );
                            if (downloaded) break;
                        }
                        idx++;
                        checked++;
                    }

                    if (checked >= q.length || !q[idx]) {
                        setIsPlaying(false);
                        return;
                    }

                    const nextMedia = q[idx];
                    const rawUri = getUri(nextMedia);
                    if (!rawUri) {
                        setIsPlaying(false);
                        return;
                    }
                    const nextHasVideo = hasVideoSource(nextMedia);
                    queueRef.current.setCurrentIndex(idx);
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
                        queueMediaId: idx,
                        queueType: queueRef.current.shuffle
                            ? EQueueType.RANDOM
                            : EQueueType.SORTED,
                    });
                })();
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
                if (outgoingUri) mediaCacheManager.deleteCached(outgoingUri);
            }

            const isShuffle = queue.shuffle;
            const { index, queue: displayQueue } = queue.setQueueAndPlay(
                media,
                newQueue
            );
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
            webSocketManager.sendCurrentQueue({
                queue: buildQueuePayload(
                    displayQueue,
                    isShuffle ? newQueue : [],
                    isShuffle,
                    listPublicIdByMediaPublicIdRef.current
                ),
            });
            webSocketManager.sendCurrentMedia({
                mediaPublicId: media.publicId,
                queueMediaId: index,
                queueType: isShuffle ? EQueueType.RANDOM : EQueueType.SORTED,
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
            const mediaPublicId = queueRef.current.currentMedia?.publicId ?? "";
            const timeFrom = currentTimeRef.current;
            await mediaEngine.seekTo(seconds);
            setCurrentTime(seconds);
            if (mediaPublicId) {
                webSocketManager.sendSeek({
                    mediaPublicId,
                    timeFrom: Math.round(timeFrom * 1000),
                    timeTo: Math.round(seconds * 1000),
                });
            }
        },
        [mediaEngine]
    );

    const skipForward = useCallback(async () => {
        const q = queue.queue;
        let nextIndex = queue.getNextIndex();
        if (nextIndex === null) return;

        // Scan forward for a downloaded item
        let scanned = 0;
        while (scanned < q.length) {
            if (nextIndex >= q.length) nextIndex = 0;

            const media = q[nextIndex];
            if (!media) break;

            const rawUri = getUri(media);
            if (rawUri && (await isMediaDownloaded(media.publicId))) {
                break;
            }
            nextIndex++;
            scanned++;
        }

        if (scanned >= q.length || !q[nextIndex]) return;

        const nextMedia = q[nextIndex];
        const rawUri = getUri(nextMedia);
        if (!rawUri) return;
        const shouldHaveVideo = hasVideoSource(nextMedia);

        // Clean up the outgoing track's cache
        const outgoingMedia = queue.currentMedia;
        if (outgoingMedia) {
            const outgoingUri = getUri(outgoingMedia);
            if (outgoingUri) mediaCacheManager.deleteCached(outgoingUri);
        }

        webSocketManager.sendSkipClicked({
            direction: "NEXT",
            mediaPublicId: queue.currentMedia?.publicId ?? nextMedia.publicId,
        });
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
            queueType: queue.shuffle ? EQueueType.RANDOM : EQueueType.SORTED,
        });
    }, [mediaEngine, queue]);

    const skipBack = useCallback(async () => {
        if (currentTime > 3) {
            await seekTo(0);
            return;
        }
        const q = queue.queue;
        let prevIndex = queue.getPrevIndex();
        if (prevIndex === null) {
            await seekTo(0);
            return;
        }

        // Scan backward for a downloaded item
        let scanned = 0;
        while (scanned < q.length) {
            if (prevIndex < 0) prevIndex = q.length - 1;

            const media = q[prevIndex];
            if (!media) break;

            const rawUri = getUri(media);
            if (rawUri && (await isMediaDownloaded(media.publicId))) {
                break;
            }
            prevIndex--;
            scanned++;
        }

        if (scanned >= q.length || !q[prevIndex]) {
            await seekTo(0);
            return;
        }

        const prevMedia = q[prevIndex];
        const rawUri = getUri(prevMedia);
        if (!rawUri) return;
        const shouldHaveVideo = hasVideoSource(prevMedia);

        // Clean up the outgoing track's cache
        const outgoingMedia = queue.currentMedia;
        if (outgoingMedia) {
            const outgoingUri = getUri(outgoingMedia);
            if (outgoingUri) mediaCacheManager.deleteCached(outgoingUri);
        }

        webSocketManager.sendSkipClicked({
            direction: "PREVIOUS",
            mediaPublicId: queue.currentMedia?.publicId ?? prevMedia.publicId,
        });
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
            queueType: queue.shuffle ? EQueueType.RANDOM : EQueueType.SORTED,
        });
    }, [currentTime, mediaEngine, queue, seekTo]);

    const toggleShuffle = useCallback(() => {
        const currentQBeforeToggle = queueRef.current.queue;
        const { newShuffle, newQueue, originalQueue } =
            queueRef.current.toggleShuffle();

        const newQueueType = newShuffle ? EQueueType.RANDOM : EQueueType.SORTED;
        webSocketManager.sendQueueType({ queueType: newQueueType });

        // When turning ON: newQueue=shuffled, originalQueue=sorted (currentQBeforeToggle)
        // When turning OFF: newQueue=sorted, originalQueue=[] (no longer shuffled)
        const sortedQ = newShuffle ? currentQBeforeToggle : [];
        webSocketManager.sendCurrentQueue({
            queue: buildQueuePayload(
                newQueue,
                sortedQ,
                newShuffle,
                listPublicIdByMediaPublicIdRef.current
            ),
        });

        const currentMedia = queueRef.current.currentMedia;
        if (currentMedia?.publicId) {
            const newIdx = newQueue.findIndex(
                (m) => m.publicId === currentMedia.publicId
            );
            webSocketManager.sendCurrentMedia({
                mediaPublicId: currentMedia.publicId,
                queueMediaId: Math.max(0, newIdx),
                queueType: newQueueType,
            });
        }
    }, []);

    const removeFromQueue = useCallback((index: number) => {
        const newQueue = queueRef.current.queue.filter((_, i) => i !== index);
        queueRef.current.removeFromQueue(index);
        webSocketManager.sendCurrentQueue({
            queue: buildQueuePayload(
                newQueue,
                queueRef.current.originalQueue,
                queueRef.current.shuffle,
                listPublicIdByMediaPublicIdRef.current
            ),
        });
    }, []);

    const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
        const newQ = [...queueRef.current.queue];
        const [moved] = newQ.splice(fromIndex, 1);
        newQ.splice(toIndex, 0, moved);
        queueRef.current.reorderQueue(fromIndex, toIndex);
        webSocketManager.sendCurrentQueue({
            queue: buildQueuePayload(
                newQ,
                queueRef.current.originalQueue,
                queueRef.current.shuffle,
                listPublicIdByMediaPublicIdRef.current
            ),
        });
    }, []);

    const addToQueueEnd = useCallback((media: TQueueMedia | TQueueMedia[]) => {
        const items = Array.isArray(media) ? media : [media];
        const newQueue = [...queueRef.current.queue, ...items];
        queueRef.current.addToQueueEnd(media);
        // originalQueueRef is updated synchronously inside addToQueueEnd
        webSocketManager.sendCurrentQueue({
            queue: buildQueuePayload(
                newQueue,
                queueRef.current.originalQueue,
                queueRef.current.shuffle,
                listPublicIdByMediaPublicIdRef.current
            ),
        });
    }, []);

    const addToQueueNext = useCallback((media: TQueueMedia | TQueueMedia[]) => {
        const items = Array.isArray(media) ? media : [media];
        const nextIndex = queueRef.current.currentIndex + 1;
        const newQ = [...queueRef.current.queue];
        newQ.splice(nextIndex, 0, ...items);
        queueRef.current.addToQueueNext(media);
        webSocketManager.sendCurrentQueue({
            queue: buildQueuePayload(
                newQ,
                queueRef.current.originalQueue,
                queueRef.current.shuffle,
                listPublicIdByMediaPublicIdRef.current
            ),
        });
    }, []);

    const playNext = useCallback(
        async (media: TQueueMedia, newQueue: TQueueMedia[]) => {
            const isShuffle = queueRef.current.shuffle;
            const { index, queue: displayQueue } =
                queueRef.current.setQueueAndPlay(media, newQueue);
            const rawUri = getUri(media);
            const shouldHaveVideo = hasVideoSource(media);
            const playUri = await resolveUri(media);
            if (!playUri) return;
            await mediaEngine.loadTrack(playUri, shouldHaveVideo);
            if (rawUri && !shouldHaveVideo && playUri === rawUri) {
                mediaCacheManager.downloadToCache(rawUri, media.publicId);
            }
            webSocketManager.sendMediaClicked({
                mediaPublicId: media.publicId,
            });

            webSocketManager.sendCurrentMedia({
                mediaPublicId: media.publicId,
                queueMediaId: index,
                queueType: isShuffle ? EQueueType.RANDOM : EQueueType.SORTED,
            });
        },
        [mediaEngine]
    );

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
                originalQueue: queue.originalQueue,
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
                playNext,
                pause,
                play,
                togglePlayPause,
                seekTo,
                skipForward,
                skipBack,
                toggleShuffle,
                cycleRepeat: () => {
                    queue.cycleRepeat();
                    Http.cycleRepeatMode();
                },
                removeFromQueue,
                reorderQueue,
                addToQueueEnd,
                addToQueueNext,
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
