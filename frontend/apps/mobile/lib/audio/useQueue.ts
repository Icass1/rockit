import { useCallback, useRef, useState } from "react";
import type { TQueueMedia } from "@rockit/shared";
import {
    ERepeatMode,
    getNextQueueMediaId,
    getPrevQueueMediaId,
    resolveNextOnEnd,
    shuffleQueue,
} from "@rockit/shared";

interface ToggleShuffleResult {
    newShuffle: boolean;
    newQueue: TQueueMedia[];
    originalQueue: TQueueMedia[];
}

interface UseQueueReturn {
    queue: TQueueMedia[];
    currentIndex: number;
    currentMedia: TQueueMedia | undefined;
    shuffle: boolean;
    repeatMode: ERepeatMode;
    originalQueue: TQueueMedia[];
    setQueueAndPlay: (
        media: TQueueMedia,
        newQueue: TQueueMedia[]
    ) => { index: number; queue: TQueueMedia[] };
    restoreQueue: (
        sortedQueue: TQueueMedia[],
        randomQueue: TQueueMedia[],
        currentMedia: TQueueMedia,
        isShuffle: boolean
    ) => number;
    getNextIndex: () => number | null;
    getPrevIndex: () => number | null;
    resolveOnEnd: () => {
        action: "replay" | "play" | "stop";
        index: number | null;
    };
    toggleShuffle: () => ToggleShuffleResult;
    cycleRepeat: () => void;
    setRepeatMode: (mode: ERepeatMode) => void;
    removeFromQueue: (index: number) => void;
    reorderQueue: (fromIndex: number, toIndex: number) => void;
    setCurrentIndex: (index: number) => void;
    addToQueueEnd: (media: TQueueMedia | TQueueMedia[]) => void;
    addToQueueNext: (media: TQueueMedia | TQueueMedia[]) => void;
    playNext: (media: TQueueMedia, newQueue: TQueueMedia[]) => Promise<void>;
}

export function useQueue(): UseQueueReturn {
    const [queue, setQueue] = useState<TQueueMedia[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [shuffle, setShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState<ERepeatMode>(ERepeatMode.OFF);

    const queueRef = useRef(queue);
    const currentIndexRef = useRef(currentIndex);
    const shuffleRef = useRef(shuffle);
    const repeatRef = useRef(repeatMode);
    const originalQueueRef = useRef<TQueueMedia[]>([]);

    queueRef.current = queue;
    currentIndexRef.current = currentIndex;
    shuffleRef.current = shuffle;
    repeatRef.current = repeatMode;

    const currentMedia = queue[currentIndex] ?? null;

    const toQueueItems = (q: TQueueMedia[]) =>
        q.map((item, i) => ({ publicId: item.publicId, queueMediaId: i }));

    const setQueueAndPlay = useCallback(
        (
            media: TQueueMedia,
            newQueue: TQueueMedia[]
        ): { index: number; queue: TQueueMedia[] } => {
            let finalQueue = [...newQueue];

            if (shuffleRef.current) {
                const targetIndex = newQueue.findIndex(
                    (m) => m.publicId === media.publicId
                );
                const items = toQueueItems(newQueue);
                const shuffled = shuffleQueue(
                    items,
                    targetIndex >= 0 ? targetIndex : null
                );
                finalQueue = shuffled.map(
                    (item) => newQueue[item.queueMediaId]
                );
                // Store the unsorted order so WS sync can compute sortedIndex
                originalQueueRef.current = [...newQueue];
            } else {
                originalQueueRef.current = [];
            }

            setQueue(finalQueue);
            const index = finalQueue.findIndex(
                (m) => m.publicId === media.publicId
            );
            const finalIndex = Math.max(0, index);
            setCurrentIndex(finalIndex);
            return { index: finalIndex, queue: finalQueue };
        },
        []
    );

    const getNextIndex = useCallback((): number | null => {
        const q = queueRef.current;
        if (shuffleRef.current && q.length > 1) {
            let nextIdx;
            do {
                nextIdx = Math.floor(Math.random() * q.length);
            } while (nextIdx === currentIndexRef.current && q.length > 1);
            return nextIdx;
        }
        const items = toQueueItems(q);
        const nextId = getNextQueueMediaId(items, currentIndexRef.current);
        return nextId;
    }, []);

    const getPrevIndex = useCallback((): number | null => {
        const items = toQueueItems(queueRef.current);
        return getPrevQueueMediaId(items, currentIndexRef.current);
    }, []);

    const resolveOnEnd = useCallback((): {
        action: "replay" | "play" | "stop";
        index: number | null;
    } => {
        const items = toQueueItems(queueRef.current);
        const { action, nextId } = resolveNextOnEnd(
            items,
            currentIndexRef.current,
            repeatRef.current
        );
        // Map EQueueAction enum to string literals
        const actionMap = {
            1: "replay",
            2: "play",
            3: "stop",
        } as const;
        return { action: actionMap[action], index: nextId };
    }, []);

    const toggleShuffle = useCallback((): ToggleShuffleResult => {
        const newShuffle = !shuffleRef.current;

        if (newShuffle) {
            const q = queueRef.current;
            const original = [...q];
            originalQueueRef.current = original;
            const items = toQueueItems(q);
            const shuffled = shuffleQueue(items, currentIndexRef.current);
            const newQueue = shuffled.map((item) => q[item.queueMediaId]);
            setQueue(newQueue);
            setCurrentIndex(0);
            setShuffle(true);
            shuffleRef.current = true;
            return { newShuffle: true, newQueue, originalQueue: original };
        } else {
            const original = originalQueueRef.current;
            const newQueue = original.length > 0 ? original : queueRef.current;
            if (original.length > 0) {
                const currentPublicId =
                    queueRef.current[currentIndexRef.current]?.publicId;
                const restoredIndex = currentPublicId
                    ? original.findIndex((m) => m.publicId === currentPublicId)
                    : -1;
                setCurrentIndex(restoredIndex >= 0 ? restoredIndex : 0);
                setQueue(original);
            }
            setShuffle(false);
            shuffleRef.current = false;
            return { newShuffle: false, newQueue, originalQueue: [] };
        }
    }, []);

    const cycleRepeat = useCallback(() => {
        setRepeatMode((r) => {
            if (r === ERepeatMode.OFF) return ERepeatMode.ONE;
            if (r === ERepeatMode.ONE) return ERepeatMode.ALL;
            return ERepeatMode.OFF;
        });
    }, []);

    const setRepeatModeValue = useCallback((mode: ERepeatMode) => {
        setRepeatMode(mode);
    }, []);

    const removeFromQueue = useCallback((index: number) => {
        // Keep originalQueueRef in sync when shuffle is active
        const removedMedia = queueRef.current[index];
        if (
            removedMedia &&
            shuffleRef.current &&
            originalQueueRef.current.length > 0
        ) {
            const origIdx = originalQueueRef.current.findIndex(
                (m) => m.publicId === removedMedia.publicId
            );
            if (origIdx !== -1) {
                originalQueueRef.current = originalQueueRef.current.filter(
                    (_, i) => i !== origIdx
                );
            }
        }
        setQueue((q) => {
            const newQ = q.filter((_, i) => i !== index);
            const curr = currentIndexRef.current;
            if (index < curr) setCurrentIndex(curr - 1);
            else if (index === curr && curr >= newQ.length)
                setCurrentIndex(Math.max(0, newQ.length - 1));
            return newQ;
        });
    }, []);

    const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
        setQueue((q) => {
            const newQ = [...q];
            const [moved] = newQ.splice(fromIndex, 1);
            newQ.splice(toIndex, 0, moved);
            const curr = currentIndexRef.current;
            if (curr === fromIndex) setCurrentIndex(toIndex);
            else if (curr > fromIndex && curr <= toIndex)
                setCurrentIndex(curr - 1);
            else if (curr < fromIndex && curr >= toIndex)
                setCurrentIndex(curr + 1);
            return newQ;
        });
    }, []);

    const addToQueueEnd = useCallback((media: TQueueMedia | TQueueMedia[]) => {
        const items = Array.isArray(media) ? media : [media];
        // Keep originalQueueRef in sync when shuffle is active
        if (shuffleRef.current && originalQueueRef.current.length > 0) {
            originalQueueRef.current = [...originalQueueRef.current, ...items];
        }
        setQueue((q) => [...q, ...items]);
    }, []);

    const addToQueueNext = useCallback((media: TQueueMedia | TQueueMedia[]) => {
        const items = Array.isArray(media) ? media : [media];
        // Keep originalQueueRef in sync when shuffle is active
        if (shuffleRef.current && originalQueueRef.current.length > 0) {
            const nextIndex = currentIndexRef.current + 1;
            const newOriginal = [...originalQueueRef.current];
            newOriginal.splice(nextIndex, 0, ...items);
            originalQueueRef.current = newOriginal;
        }
        setQueue((q) => {
            const nextIndex = currentIndexRef.current + 1;
            const newQ = [...q];
            newQ.splice(nextIndex, 0, ...items);
            return newQ;
        });
    }, []);

    const restoreQueue = useCallback(
        (
            sortedQueue: TQueueMedia[],
            randomQueue: TQueueMedia[],
            currentMedia: TQueueMedia,
            isShuffle: boolean
        ): number => {
            if (isShuffle) {
                originalQueueRef.current = sortedQueue;
                setQueue(randomQueue);
                setShuffle(true);
                const index = Math.max(
                    0,
                    randomQueue.findIndex(
                        (m) => m.publicId === currentMedia.publicId
                    )
                );
                setCurrentIndex(index);
                return index;
            } else {
                originalQueueRef.current = [];
                setQueue(sortedQueue);
                setShuffle(false);
                const index = Math.max(
                    0,
                    sortedQueue.findIndex(
                        (m) => m.publicId === currentMedia.publicId
                    )
                );
                setCurrentIndex(index);
                return index;
            }
        },
        []
    );

    const playNext = useCallback(
        async (media: TQueueMedia, newQueue: TQueueMedia[]): Promise<void> => {
            const { index } = setQueueAndPlay(media, newQueue);
            setCurrentIndex(index);
        },
        [setQueueAndPlay]
    );

    return {
        queue,
        currentIndex,
        currentMedia,
        shuffle,
        repeatMode,
        originalQueue: originalQueueRef.current,
        setQueueAndPlay,
        restoreQueue,
        getNextIndex,
        getPrevIndex,
        resolveOnEnd,
        toggleShuffle,
        cycleRepeat,
        setRepeatMode: setRepeatModeValue,
        removeFromQueue,
        reorderQueue,
        setCurrentIndex,
        addToQueueEnd,
        addToQueueNext,
        playNext,
    };
}
