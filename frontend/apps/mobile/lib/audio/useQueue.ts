import { useCallback, useRef, useState } from "react";
import type { TQueueMedia } from "@rockit/shared";
import {
    ERepeatMode,
    getNextQueueMediaId,
    getPrevQueueMediaId,
    resolveNextOnEnd,
    shuffleQueue,
} from "@rockit/shared";

interface UseQueueReturn {
    queue: TQueueMedia[];
    currentIndex: number;
    currentMedia: TQueueMedia | null;
    shuffle: boolean;
    repeatMode: ERepeatMode;
    setQueueAndPlay: (media: TQueueMedia, newQueue: TQueueMedia[]) => number;
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
    addToQueueEnd: (media: TQueueMedia | TQueueMedia[]) => void;
    addToQueueNext: (media: TQueueMedia | TQueueMedia[]) => void;
    playNext: (media: TQueueMedia, newQueue: TQueueMedia[]) => Promise<void>;
}

export function useQueue(): UseQueueReturn {
    const [queue, setQueue] = useState<TQueueMedia[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [shuffle, setShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState<ERepeatMode>(ERepeatMode.ONE);

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
        (media: TQueueMedia, newQueue: TQueueMedia[]): number => {
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

    const toggleShuffle = useCallback(() => {
        setShuffle((s) => {
            const next = !s;
            if (next) {
                const q = queueRef.current;
                originalQueueRef.current = [...q];
                const items = toQueueItems(q);
                const shuffled = shuffleQueue(items, currentIndexRef.current);
                const newQueue = shuffled.map((item) => q[item.queueMediaId]);
                setQueue(newQueue);
                setCurrentIndex(0);
            } else {
                const original = originalQueueRef.current;
                if (original.length > 0) {
                    setQueue(original);
                    const currentPublicId =
                        queueRef.current[currentIndexRef.current]?.publicId;
                    const restoredIndex = original.findIndex(
                        (m) => m.publicId === currentPublicId
                    );
                    setCurrentIndex(restoredIndex >= 0 ? restoredIndex : 0);
                }
            }
            return next;
        });
    }, []);

    const cycleRepeat = useCallback(() => {
        setRepeatMode((r) => {
            if (r === ERepeatMode.OFF) return ERepeatMode.ONE;
            if (r === ERepeatMode.ONE) return ERepeatMode.ALL;
            return ERepeatMode.OFF;
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

    const addToQueueEnd = useCallback((media: TQueueMedia | TQueueMedia[]) => {
        setQueue((q) => {
            const items = Array.isArray(media) ? media : [media];
            return [...q, ...items];
        });
    }, []);

    const addToQueueNext = useCallback((media: TQueueMedia | TQueueMedia[]) => {
        setQueue((q) => {
            const items = Array.isArray(media) ? media : [media];
            const nextIndex = currentIndexRef.current + 1;
            const newQ = [...q];
            newQ.splice(nextIndex, 0, ...items);
            return newQ;
        });
    }, []);

    const playNext = useCallback(
        async (media: TQueueMedia, newQueue: TQueueMedia[]): Promise<void> => {
            const index = setQueueAndPlay(media, newQueue);
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
        setQueueAndPlay,
        getNextIndex,
        getPrevIndex,
        resolveOnEnd,
        toggleShuffle,
        cycleRepeat,
        removeFromQueue,
        reorderQueue,
        setCurrentIndex,
        addToQueueEnd,
        addToQueueNext,
        playNext,
    };
}
