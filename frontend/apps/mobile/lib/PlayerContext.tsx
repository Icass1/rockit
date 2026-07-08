import { useStore } from "@nanostores/react";
import {
    EQueueType,
    ERepeatMode,
    isVideo,
    type TQueueMedia,
} from "@rockit/shared";
import type { VideoPlayer } from "expo-video";
import {
    DEFAULT_CROSSFADE,
    type CrossfadeSettings,
} from "@/lib/audio/crossfade";
import { rockIt } from "@/lib/rockit/rockIt";

export type { CrossfadeSettings };
export { DEFAULT_CROSSFADE };

interface PlayerTimeContextType {
    currentTime: number;
    duration: number;
}

interface PlayerContextType {
    currentMedia: TQueueMedia | undefined;
    queue: TQueueMedia[];
    currentIndex: number;
    isPlaying: boolean;
    isLoading: boolean;
    isPlayerVisible: boolean;
    queueType: EQueueType;
    repeatMode: ERepeatMode;
    crossfadeSettings: CrossfadeSettings;
    updateCrossfadeSettings: (s: Partial<CrossfadeSettings>) => void;
    videoPlayer: VideoPlayer | null;
    videoOpacity: number;
    hasVideo: boolean;
    audioOnly: boolean;
    canToggleAudioOnly: boolean;
    toggleAudioOnly: () => void;

    playMedia: (media: TQueueMedia, queue: TQueueMedia[]) => Promise<void>;
    playNext: (media: TQueueMedia, newQueue: TQueueMedia[]) => Promise<void>;
    originalQueue: TQueueMedia[];
    pause: () => Promise<void>;
    play: () => Promise<void>;
    togglePlayPause: () => Promise<void>;
    seekTo: (seconds: number) => Promise<void>;
    skipForward: () => Promise<void>;
    skipBack: () => Promise<void>;
    toggleRandomQueue: () => void;
    cycleRepeat: () => void;
    removeFromQueue: (index: number) => void;
    reorderQueue: (fromIndex: number, toIndex: number) => void;
    addToQueueEnd: (media: TQueueMedia | TQueueMedia[]) => void;
    addToQueueNext: (media: TQueueMedia | TQueueMedia[]) => void;
    showPlayer: () => void;
    hidePlayer: () => void;
}

/**
 * The player is now a set of nanostores-backed singleton managers (shared with
 * web). This provider is a pass-through kept for compatibility with the
 * existing layout tree; the hooks below read the singleton managers directly.
 */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export function usePlayer(): PlayerContextType {
    const currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const queueItems = useStore(rockIt.queueManager.queueAtom);
    const sortedItems = useStore(rockIt.queueManager.sortedQueueAtom);
    const currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );
    const isPlaying = useStore(rockIt.mediaPlayerManager.playingAtom);
    const isLoading = useStore(rockIt.mediaPlayerManager.loadingAtom);
    const isPlayerVisible = useStore(rockIt.playerUIManager.visibleAtom);
    const queueType = useStore(rockIt.userManager.queueTypeAtom);
    const repeatMode = useStore(rockIt.userManager.repeatModeAtom);
    const videoPlayer = useStore(rockIt.mediaPlayerManager.videoPlayerAtom);
    const audioOnly = useStore(rockIt.mediaPlayerManager.audioOnlyAtom);
    const crossfadeSettings = useStore(
        rockIt.mediaPlayerManager.crossfadeSettingsAtom
    );

    const queue = queueItems.map((i) => i.media);
    const originalQueue = sortedItems.map((i) => i.media);
    const currentIndex = queueItems.findIndex(
        (i) => i.queueMediaId === currentQueueMediaId
    );
    const hasVideo = currentMedia ? isVideo(currentMedia) && !audioOnly : false;
    const canToggleAudioOnly =
        rockIt.mediaPlayerManager.canPlayAudioOnly(currentMedia);

    return {
        currentMedia,
        queue,
        originalQueue,
        currentIndex,
        isPlaying,
        isLoading,
        isPlayerVisible,
        queueType,
        repeatMode,
        crossfadeSettings: crossfadeSettings ?? DEFAULT_CROSSFADE,
        updateCrossfadeSettings: (s) =>
            rockIt.mediaPlayerManager.updateCrossfadeSettings(s),
        videoPlayer,
        videoOpacity: hasVideo ? 1 : 0,
        hasVideo,
        audioOnly,
        canToggleAudioOnly,
        toggleAudioOnly: () => rockIt.mediaPlayerManager.toggleAudioOnly(),

        playMedia: async (media, newQueue) => {
            rockIt.queueManager.setMedia(newQueue, media.publicId);
            const idx = newQueue.findIndex(
                (m) => m.publicId === media.publicId
            );
            rockIt.queueManager.setQueueMediaId(idx >= 0 ? idx : 0);
            rockIt.mediaPlayerManager.play();
        },
        playNext: async (media, newQueue) => {
            rockIt.queueManager.setMedia(newQueue, media.publicId);
            const idx = newQueue.findIndex(
                (m) => m.publicId === media.publicId
            );
            rockIt.queueManager.setQueueMediaId(idx >= 0 ? idx : 0);
            rockIt.mediaPlayerManager.play();
        },
        pause: async () => {
            rockIt.mediaPlayerManager.pause();
        },
        play: async () => {
            rockIt.mediaPlayerManager.play();
        },
        togglePlayPause: async () => {
            rockIt.mediaPlayerManager.togglePlayPause();
        },
        seekTo: async (seconds) => {
            rockIt.mediaPlayerManager.setCurrentTime(seconds, true);
        },
        skipForward: async () => {
            rockIt.queueManager.skipForward();
        },
        skipBack: async () => {
            rockIt.queueManager.skipBack();
        },
        toggleRandomQueue: () => rockIt.userManager.toggleRandomQueue(),
        cycleRepeat: () => rockIt.userManager.cycleRepeatMode(),
        removeFromQueue: (index) => {
            const item = rockIt.queueManager.queue[index];
            if (item) rockIt.queueManager.removeMediaFromQueue(item.media);
        },
        reorderQueue: (fromIndex, toIndex) =>
            rockIt.queueManager.reorderQueue(fromIndex, toIndex),
        addToQueueEnd: (media) => {
            const items = Array.isArray(media) ? media : [media];
            items.forEach((m) => rockIt.queueManager.addMediaToEnd(m));
        },
        addToQueueNext: (media) => {
            const items = Array.isArray(media) ? media : [media];
            // Insert in reverse so the first item ends up immediately next.
            [...items]
                .reverse()
                .forEach((m) => rockIt.queueManager.addMediaNext(m));
        },
        showPlayer: () => rockIt.playerUIManager.show(),
        hidePlayer: () => rockIt.playerUIManager.hide(),
    };
}

export function usePlayerTime(): PlayerTimeContextType {
    const currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const duration = useStore(rockIt.mediaPlayerManager.durationAtom);
    return { currentTime, duration };
}
