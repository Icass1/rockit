import { createContext, useContext } from "react";
import { useStore } from "@nanostores/react";
import {
    EQueueType,
    ERepeatMode,
    isDownloadable,
    isVideo,
    type TQueueMedia,
} from "@rockit/shared";
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
 * A media that hasn't been downloaded has no playable source. Attempting to
 * play it would fall through to the queue's skip-to-next logic and start a
 * different (previous) track, so we reject it up-front and warn the user.
 */
function isPlayableSource(
    media: TQueueMedia,
    services: typeof rockIt
): boolean {
    if (isDownloadable(media) && media.downloaded !== true) {
        services.notificationManager.notifyWarn(
            services.vocabularyManager.vocabulary.MEDIA_NOT_DOWNLOADED
        );
        return false;
    }
    return true;
}

const PlayerServices = createContext<typeof rockIt | null>(null);

export function PlayerProvider({
    children,
    services = rockIt,
}: {
    children: React.ReactNode;
    services?: typeof rockIt;
}) {
    return <PlayerServices value={services}>{children}</PlayerServices>;
}

function usePlayerServices() {
    const services = useContext(PlayerServices);
    if (!services) throw new Error("PlayerProvider is required");
    return services;
}

export function usePlayer(): PlayerContextType {
    const services = usePlayerServices();
    const currentMedia = useStore(services.queueManager.currentMediaAtom);
    const queueItems = useStore(services.queueManager.queueAtom);
    const sortedItems = useStore(services.queueManager.sortedQueueAtom);
    const currentQueueMediaId = useStore(
        services.queueManager.currentQueueMediaIdAtom
    );
    const isPlaying = useStore(services.mediaPlayerManager.playingAtom);
    const isLoading = useStore(services.mediaPlayerManager.loadingAtom);
    const isPlayerVisible = useStore(services.playerUIManager.visibleAtom);
    const queueType = useStore(services.userManager.queueTypeAtom);
    const repeatMode = useStore(services.userManager.repeatModeAtom);
    const audioOnly = useStore(services.mediaPlayerManager.audioOnlyAtom);
    const crossfadeSettings = useStore(
        services.mediaPlayerManager.crossfadeSettingsAtom
    );

    const queue = queueItems.map((i) => i.media);
    const originalQueue = sortedItems.map((i) => i.media);
    const currentIndex = queueItems.findIndex(
        (i) => i.queueMediaId === currentQueueMediaId
    );
    const hasVideo = currentMedia ? isVideo(currentMedia) && !audioOnly : false;
    const canToggleAudioOnly =
        services.mediaPlayerManager.canPlayAudioOnly(currentMedia);

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
            services.mediaPlayerManager.updateCrossfadeSettings(s),
        videoOpacity: hasVideo ? 1 : 0,
        hasVideo,
        audioOnly,
        canToggleAudioOnly,
        toggleAudioOnly: () => services.mediaPlayerManager.toggleAudioOnly(),

        playMedia: async (media, newQueue) => {
            if (!isPlayableSource(media, services)) return;
            services.queueManager.setMedia(newQueue, media.publicId);
            const idx = newQueue.findIndex(
                (m) => m.publicId === media.publicId
            );
            services.queueManager.setQueueMediaId(idx >= 0 ? idx : 0);
            services.mediaPlayerManager.play();
        },
        playNext: async (media, newQueue) => {
            if (!isPlayableSource(media, services)) return;
            services.queueManager.setMedia(newQueue, media.publicId);
            const idx = newQueue.findIndex(
                (m) => m.publicId === media.publicId
            );
            services.queueManager.setQueueMediaId(idx >= 0 ? idx : 0);
            services.mediaPlayerManager.play();
        },
        pause: async () => {
            services.mediaPlayerManager.pause();
        },
        play: async () => {
            services.mediaPlayerManager.play();
        },
        togglePlayPause: async () => {
            services.mediaPlayerManager.togglePlayPause();
        },
        seekTo: async (seconds) => {
            services.mediaPlayerManager.setCurrentTime(seconds, true);
        },
        skipForward: async () => {
            services.queueManager.skipForward();
        },
        skipBack: async () => {
            services.queueManager.skipBack();
        },
        toggleRandomQueue: () => services.userManager.toggleRandomQueue(),
        cycleRepeat: () => services.userManager.cycleRepeatMode(),
        removeFromQueue: (index) => {
            const item = services.queueManager.queue[index];
            if (item) services.queueManager.removeMediaFromQueue(item.media);
        },
        reorderQueue: (fromIndex, toIndex) =>
            services.queueManager.reorderQueue(fromIndex, toIndex),
        addToQueueEnd: (media) => {
            const items = Array.isArray(media) ? media : [media];
            items.forEach((m) => services.queueManager.addMediaToEnd(m));
        },
        addToQueueNext: (media) => {
            const items = Array.isArray(media) ? media : [media];
            // Insert in reverse so the first item ends up immediately next.
            [...items]
                .reverse()
                .forEach((m) => services.queueManager.addMediaNext(m));
        },
        showPlayer: () => services.playerUIManager.show(),
        hidePlayer: () => services.playerUIManager.hide(),
    };
}

export function usePlayerTime(): PlayerTimeContextType {
    const services = usePlayerServices();
    const currentTime = useStore(services.mediaPlayerManager.currentTimeAtom);
    const duration = useStore(services.mediaPlayerManager.durationAtom);
    return { currentTime, duration };
}
