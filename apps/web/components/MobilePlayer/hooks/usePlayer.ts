"use client";

import { useStore } from "@nanostores/react";
import { EQueueType, ERepeatMode } from "@rockit/shared";
import type { QueueItem } from "@/models/interfaces/queue";
import { usePlaybackServices } from "@/components/providers/PlaybackProvider";

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
    const { mediaPlayerManager, queueManager, userManager, playerUIManager } =
        usePlaybackServices();
    const currentMedia = useStore(queueManager.currentMediaAtom);
    const isPlaying = useStore(mediaPlayerManager.playingAtom);
    const isLoading = useStore(mediaPlayerManager.loadingAtom);
    const isPlayerVisible = useStore(playerUIManager.visibleAtom);
    const repeatMode = useStore(userManager.repeatModeAtom);
    const queueType = useStore(userManager.queueTypeAtom);
    const queue = useStore(queueManager.queueAtom);

    function togglePlayPause(): void {
        mediaPlayerManager.togglePlayPause();
    }

    function skipForward(): void {
        queueManager.skipForward();
    }

    function skipBack(): void {
        queueManager.skipBack();
    }

    function toggleRandomQueue(): void {
        userManager.toggleRandomQueue();
    }

    function cycleRepeat(): void {
        userManager.cycleRepeatMode();
    }

    function showPlayer(): void {
        playerUIManager.show();
    }

    function hidePlayer(): void {
        playerUIManager.hide();
    }

    function seekTo(seconds: number): void {
        mediaPlayerManager.setCurrentTime(seconds, true);
    }

    function removeFromQueue(index: number): void {
        const item = queueManager.queue[index];
        if (item) queueManager.removeMediaFromQueue(item.media);
    }

    function reorderQueue(fromIndex: number, toIndex: number): void {
        queueManager.reorderQueue(fromIndex, toIndex);
    }

    function playQueueItem(queueMediaId: number): void {
        queueManager.setQueueMediaId(queueMediaId);
        mediaPlayerManager.play();
    }

    function addToQueueEnd(media: QueueItem["media"]): void {
        queueManager.addMediaToEnd(media);
    }

    function addToQueueNext(media: QueueItem["media"]): void {
        queueManager.addMediaNext(media);
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
    const { mediaPlayerManager } = usePlaybackServices();
    const currentTime = useStore(mediaPlayerManager.currentTimeAtom);
    const duration = useStore(mediaPlayerManager.durationAtom);

    return { currentTime, duration };
}

export function PlayerProvider({
    children,
}: {
    children: React.ReactNode;
}): React.ReactNode {
    return children;
}
