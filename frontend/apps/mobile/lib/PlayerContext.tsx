import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { Audio, AVPlaybackStatus } from "expo-av";

export type RepeatMode = "none" | "one" | "all";

interface PlayerContextType {
    currentMedia: BaseSongWithAlbumResponse | null;
    queue: BaseSongWithAlbumResponse[];
    currentIndex: number;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isPlayerVisible: boolean;
    shuffle: boolean;
    repeatMode: RepeatMode;
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
    const soundRef = useRef<Audio.Sound | null>(null);

    const [currentMedia, setCurrentMedia] =
        useState<BaseSongWithAlbumResponse | null>(null);
    const [queue, setQueue] = useState<BaseSongWithAlbumResponse[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlayerVisible, setIsPlayerVisible] = useState(false);
    const [shuffle, setShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");

    const queueRef = useRef(queue);
    const currentIndexRef = useRef(currentIndex);
    const repeatModeRef = useRef(repeatMode);
    const shuffleRef = useRef(shuffle);

    useEffect(() => {
        queueRef.current = queue;
    }, [queue]);
    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);
    useEffect(() => {
        repeatModeRef.current = repeatMode;
    }, [repeatMode]);
    useEffect(() => {
        shuffleRef.current = shuffle;
    }, [shuffle]);

    const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setCurrentTime(status.positionMillis / 1000);
        setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
        setIsPlaying(status.isPlaying);

        if (status.didJustFinish) {
            const rMode = repeatModeRef.current;
            const q = queueRef.current;
            const idx = currentIndexRef.current;

            if (rMode === "one") {
                soundRef.current?.replayAsync();
                return;
            }
            const nextIdx = shuffleRef.current
                ? Math.floor(Math.random() * q.length)
                : idx + 1;

            if (nextIdx < q.length) {
                loadAndPlay(q[nextIdx], q, nextIdx);
            } else if (rMode === "all" && q.length > 0) {
                loadAndPlay(q[0], q, 0);
            } else {
                setIsPlaying(false);
            }
        }
    }, []);

    const loadAndPlay = useCallback(
        async (
            media: BaseSongWithAlbumResponse,
            newQueue: BaseSongWithAlbumResponse[],
            index: number
        ) => {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            setCurrentMedia(media);
            setQueue(newQueue);
            setCurrentIndex(index);
            setCurrentTime(0);
            setDuration(0);

            const audioUri = media.audioSrc;
            if (!audioUri) {
                setIsPlaying(false);
                return;
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: audioUri },
                { shouldPlay: true, progressUpdateIntervalMillis: 500 },
                onPlaybackStatusUpdate
            );
            soundRef.current = sound;
            setIsPlaying(true);
        },
        [onPlaybackStatusUpdate]
    );

    useEffect(() => {
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            interruptionModeIOS: 2,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: 2,
            playThroughEarpieceAndroid: false,
        });

        return () => {
            soundRef.current?.unloadAsync();
        };
    }, []);

    const playMedia = useCallback(
        async (
            media: BaseSongWithAlbumResponse,
            newQueue: BaseSongWithAlbumResponse[]
        ) => {
            const index = newQueue.findIndex(
                (m) => m.publicId === media.publicId
            );
            await loadAndPlay(media, newQueue, Math.max(index, 0));
            setIsPlayerVisible(true);
        },
        [loadAndPlay]
    );

    const pause = useCallback(async () => {
        await soundRef.current?.pauseAsync();
        setIsPlaying(false);
    }, []);

    const play = useCallback(async () => {
        await soundRef.current?.playAsync();
        setIsPlaying(true);
    }, []);

    const togglePlayPause = useCallback(async () => {
        if (isPlaying) {
            await pause();
        } else {
            await play();
        }
    }, [isPlaying, pause, play]);

    const seekTo = useCallback(async (seconds: number) => {
        await soundRef.current?.setPositionAsync(seconds * 1000);
        setCurrentTime(seconds);
    }, []);

    const skipForward = useCallback(async () => {
        const q = queueRef.current;
        const idx = currentIndexRef.current;
        const nextIdx = shuffleRef.current
            ? Math.floor(Math.random() * q.length)
            : idx + 1;

        if (nextIdx < q.length) {
            await loadAndPlay(q[nextIdx], q, nextIdx);
        } else if (repeatModeRef.current === "all" && q.length > 0) {
            await loadAndPlay(q[0], q, 0);
        }
    }, [loadAndPlay]);

    const skipBack = useCallback(async () => {
        if (currentTime > 3) {
            await seekTo(0);
            return;
        }
        const idx = currentIndexRef.current;
        const q = queueRef.current;
        const prevIdx = idx - 1;
        if (prevIdx >= 0) {
            await loadAndPlay(q[prevIdx], q, prevIdx);
        } else {
            await seekTo(0);
        }
    }, [currentTime, loadAndPlay, seekTo]);

    const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);

    const cycleRepeat = useCallback(() => {
        setRepeatMode((r) => {
            if (r === "none") return "all";
            if (r === "all") return "one";
            return "none";
        });
    }, []);

    const removeFromQueue = useCallback((index: number) => {
        setQueue((q) => {
            const newQ = q.filter((_, i) => i !== index);
            const curr = currentIndexRef.current;
            if (index < curr) {
                setCurrentIndex(curr - 1);
            } else if (index === curr && curr >= newQ.length) {
                setCurrentIndex(Math.max(0, newQ.length - 1));
            }
            return newQ;
        });
    }, []);

    const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
        setQueue((q) => {
            const newQ = [...q];
            const [moved] = newQ.splice(fromIndex, 1);
            newQ.splice(toIndex, 0, moved);

            const curr = currentIndexRef.current;
            if (curr === fromIndex) {
                setCurrentIndex(toIndex);
            } else if (curr > fromIndex && curr <= toIndex) {
                setCurrentIndex(curr - 1);
            } else if (curr < fromIndex && curr >= toIndex) {
                setCurrentIndex(curr + 1);
            }
            return newQ;
        });
    }, []);

    const showPlayer = useCallback(() => setIsPlayerVisible(true), []);
    const hidePlayer = useCallback(() => setIsPlayerVisible(false), []);

    return (
        <PlayerContext.Provider
            value={{
                currentMedia,
                queue,
                currentIndex,
                isPlaying,
                currentTime,
                duration,
                isPlayerVisible,
                shuffle,
                repeatMode,
                playMedia,
                pause,
                play,
                togglePlayPause,
                seekTo,
                skipForward,
                skipBack,
                toggleShuffle,
                cycleRepeat,
                removeFromQueue,
                reorderQueue,
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
