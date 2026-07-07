"use client";

import { useStore } from "@nanostores/react";
import { EQueueType, ERepeatMode, getMediaDuration } from "@rockit/shared";
import type { QueueItem } from "@/models/interfaces/queue";
import { rockIt } from "@/lib/rockit/rockIt";

/**
 * Web-compatible `usePlayer()` — wraps the existing rockIt nanostores
 * into the same shape that the mobile PlayerContext exposes, so the
 * mobile-player components can import `@/lib/PlayerContext` on either
 * platform without changing their internals.
 */
export function usePlayer(): {
    currentMedia: QueueItem["media"] | undefined;
    isPlaying: boolean;
    isLoading: boolean;
    isPlayerVisible: boolean;
    repeatMode: ERepeatMode;
    queueType: EQueueType;
    queue: QueueItem[];
    togglePlayPause: () => void;
    skipForward: () => void;
    skipBack: () => void;
    toggleRandomQueue: () => void;
    cycleRepeat: () => void;
    showPlayer: () => void;
    hidePlayer: () => void;
    seekTo: (seconds: number) => void;
    removeFromQueue: (index: number) => void;
    reorderQueue: (from: number, to: number) => void;
    playQueueItem: (queueMediaId: number) => void;
    addToQueueEnd: (media: QueueItem["media"]) => void;
    addToQueueNext: (media: QueueItem["media"]) => void;
} {
    const currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const isPlaying = useStore(rockIt.mediaPlayerManager.playingAtom);
    const isLoading = useStore(rockIt.mediaPlayerManager.loadingAtom);
    const isPlayerVisible = useStore(rockIt.playerUIManager.visibleAtom);
    const repeatMode = useStore(rockIt.userManager.repeatModeAtom);
    const queueType = useStore(rockIt.userManager.queueTypeAtom);
    const queue = useStore(rockIt.queueManager.queueAtom);

    function togglePlayPause(): void {
        rockIt.mediaPlayerManager.togglePlayPause();
    }

    function skipForward(): void {
        rockIt.queueManager.skipForward();
    }

    function skipBack(): void {
        rockIt.queueManager.skipBack();
    }

    function toggleRandomQueue(): void {
        rockIt.userManager.toggleRandomQueue();
    }

    function cycleRepeat(): void {
        rockIt.userManager.cycleRepeatMode();
    }

    function showPlayer(): void {
        rockIt.playerUIManager.show();
    }

    function hidePlayer(): void {
        rockIt.playerUIManager.hide();
    }

    function seekTo(seconds: number): void {
        rockIt.mediaPlayerManager.setCurrentTime(seconds, true);
    }

    function removeFromQueue(index: number): void {
        const item = rockIt.queueManager.queue[index];
        if (item) rockIt.queueManager.removeMediaFromQueue(item.media);
    }

    function reorderQueue(fromIndex: number, toIndex: number): void {
        rockIt.queueManager.reorderQueue(fromIndex, toIndex);
    }

    function playQueueItem(queueMediaId: number): void {
        rockIt.queueManager.setQueueMediaId(queueMediaId);
        rockIt.mediaPlayerManager.play();
    }

    function addToQueueEnd(media: QueueItem["media"]): void {
        rockIt.queueManager.addMediaToEnd(media);
    }

    function addToQueueNext(media: QueueItem["media"]): void {
        rockIt.queueManager.addMediaNext(media);
    }

    return {
        currentMedia,
        isPlaying,
        isLoading,
        isPlayerVisible,
        repeatMode,
        queueType,
        queue,
        togglePlayPause,
        skipForward,
        skipBack,
        toggleRandomQueue,
        cycleRepeat,
        showPlayer,
        hidePlayer,
        seekTo,
        removeFromQueue,
        reorderQueue,
        playQueueItem,
        addToQueueEnd,
        addToQueueNext,
    };
}

export function usePlayerTime(): {
    currentTime: number;
    duration: number;
} {
    const currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const duration = getMediaDuration(currentMedia) ?? 0;

    return { currentTime, duration };
}

export function PlayerProvider({
    children,
}: {
    children: React.ReactNode;
}): React.ReactNode {
    return children;
}
