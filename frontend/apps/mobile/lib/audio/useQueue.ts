import { useCallback, useRef, useState } from "react";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import {
    getNextQueueMediaId,
    getPrevQueueMediaId,
    resolveNextOnEnd,
    shuffleQueue,
} from "@rockit/shared";

export type RepeatMode = "none" | "one" | "all";

function toSharedRepeat(mode: RepeatMode): "OFF" | "ONE" | "ALL" {
    if (mode === "one") return "ONE";
    if (mode === "all") return "ALL";
    return "OFF";
}

interface UseQueueReturn {
    queue: BaseSongWithAlbumResponse[];
    currentIndex: number;
    currentMedia: BaseSongWithAlbumResponse | null;
    shuffle: boolean;
    repeatMode: RepeatMode;
    setQueueAndPlay: (
        media: BaseSongWithAlbumResponse,
        newQueue: BaseSongWithAlbumResponse[]
    ) => number;
    getNextIndex: () => number | null;
    getPrevIndex: () => number | null;
    resolveOnEnd: () => {
        action: "replay" | "play" | "stop";
        index: number | null;
    };
    toggleShuffle: () => void;
    cycleRepeat: () => void;
    removeFromQueue: (index: number) => void;
    reorderQueue: (fromIndex: number, toIndex: number) => void;
    setCurrentIndex: (index: number) => void;
}

export function useQueue(): UseQueueReturn {
    const [queue, setQueue] = useState<BaseSongWithAlbumResponse[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [shuffle, setShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");

    const queueRef = useRef(queue);
    const currentIndexRef = useRef(currentIndex);
    const shuffleRef = useRef(shuffle);
    const repeatRef = useRef(repeatMode);

    queueRef.current = queue;
    currentIndexRef.current = currentIndex;
    shuffleRef.current = shuffle;
    repeatRef.current = repeatMode;

    const currentMedia = queue[currentIndex] ?? null;

    const toQueueItems = (q: BaseSongWithAlbumResponse[]) =>
        q.map((item, i) => ({ publicId: item.publicId, queueMediaId: i }));

    const setQueueAndPlay = useCallback(
        (
            media: BaseSongWithAlbumResponse,
            newQueue: BaseSongWithAlbumResponse[]
        ): number => {
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
            }

            setQueue(finalQueue);
            const index = finalQueue.findIndex(
                (m) => m.publicId === media.publicId
            );
            const finalIndex = Math.max(0, index);
            setCurrentIndex(finalIndex);
            return finalIndex;
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
            toSharedRepeat(repeatRef.current)
        );
        return { action, index: nextId };
    }, []);

    const toggleShuffle = useCallback(() => {
        setShuffle((s) => {
            const next = !s;
            if (next) {
                const q = queueRef.current;
                const items = toQueueItems(q);
                const shuffled = shuffleQueue(items, currentIndexRef.current);
                const newQueue = shuffled.map((item) => q[item.queueMediaId]);
                setQueue(newQueue);
                setCurrentIndex(0);
            }
            return next;
        });
    }, []);

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

    return {
        queue,
        currentIndex,
        currentMedia,
        shuffle,
        repeatMode,
        setQueueAndPlay,
        getNextIndex,
        getPrevIndex,
        resolveOnEnd,
        toggleShuffle,
        cycleRepeat,
        removeFromQueue,
        reorderQueue,
        setCurrentIndex,
    };
}
