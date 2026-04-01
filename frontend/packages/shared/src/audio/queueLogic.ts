/**
 * Pure queue logic — no platform dependencies, works in web and mobile.
 * All functions are stateless and return new arrays (immutable).
 */

export interface QueueItem {
    publicId: string;
    queueMediaId: number;
}

/**
 * Fisher-Yates shuffle. Keeps currentId at index 0.
 */
export function shuffleQueue<T extends QueueItem>(
    queue: T[],
    currentId: number | null
): T[] {
    if (queue.length <= 1) return queue;
    const shuffled = [...queue];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (currentId !== null) {
        const currentIndex = shuffled.findIndex(
            (item) => item.queueMediaId === currentId
        );
        if (currentIndex > 0) {
            [shuffled[0], shuffled[currentIndex]] = [
                shuffled[currentIndex],
                shuffled[0],
            ];
        }
    }
    return shuffled;
}

/**
 * Get next queue media id after current. Returns null if at end.
 */
export function getNextQueueMediaId<T extends QueueItem>(
    queue: T[],
    currentId: number | null
): number | null {
    if (!queue.length || currentId === null) return null;
    const currentIndex = queue.findIndex(
        (item) => item.queueMediaId === currentId
    );
    if (currentIndex === -1 || currentIndex + 1 >= queue.length) return null;
    return queue[currentIndex + 1].queueMediaId;
}

/**
 * Get previous queue media id. Returns null if at start.
 */
export function getPrevQueueMediaId<T extends QueueItem>(
    queue: T[],
    currentId: number | null
): number | null {
    if (!queue.length || currentId === null) return null;
    const currentIndex = queue.findIndex(
        (item) => item.queueMediaId === currentId
    );
    if (currentIndex <= 0) return null;
    return queue[currentIndex - 1].queueMediaId;
}

/**
 * Resolve which queueMediaId to play next based on repeat mode.
 * Returns null if playback should stop.
 */
export function resolveNextOnEnd<T extends QueueItem>(
    queue: T[],
    currentId: number | null,
    repeatMode: "OFF" | "ONE" | "ALL"
): { action: "replay" | "play" | "stop"; nextId: number | null } {
    if (repeatMode === "ONE") {
        return { action: "replay", nextId: currentId };
    }
    const nextId = getNextQueueMediaId(queue, currentId);
    if (nextId !== null) {
        return { action: "play", nextId };
    }
    if (repeatMode === "ALL" && queue.length > 0) {
        return { action: "play", nextId: queue[0].queueMediaId };
    }
    return { action: "stop", nextId: null };
}
