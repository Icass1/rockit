import {
    getMediaArtists,
    getMediaDuration,
    getMediaSubtitle,
    getRockIt,
    type TPlayableMedia,
} from "@rockit/shared";
import {
    AudioIntegrationService,
    type LockScreenMetadata,
} from "@/lib/audio/AudioIntegration";
import {
    NativeMediaBridge,
    type AutoQueueItem,
} from "@/lib/audio/NativeMediaBridge";

function lockScreenMetadata(media: TPlayableMedia): LockScreenMetadata {
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

/**
 * Bridges the shared player/queue atoms to the OS lock-screen / Android-Auto
 * integrations. Replaces the React `useEffect` wiring that used to live in
 * PlayerContext with plain atom subscriptions registered once at startup.
 */
export class LockScreenManager {
    private _initialized = false;

    init(): void {
        if (this._initialized) return;
        this._initialized = true;

        const player = getRockIt().mediaPlayerManager;
        const queue = getRockIt().queueManager;

        // Lock-screen transport commands → player actions
        AudioIntegrationService.setCallbacks({
            onPlay: () => player.play(),
            onPause: () => player.pause(),
            onSeekForward: (seconds) =>
                player.setCurrentTime(player.currentTime + seconds, true),
            onSeekBackward: (seconds) =>
                player.setCurrentTime(
                    Math.max(0, player.currentTime - seconds),
                    true
                ),
            onNextTrack: () => queue.skipForward(),
            onPreviousTrack: () => queue.skipBack(),
            onBluetoothConnect: () => {
                if (queue.currentMedia) player.play();
            },
            onBluetoothDisconnect: () => {},
            onHeadsetConnect: () => {
                if (queue.currentMedia) player.play();
            },
            onHeadsetDisconnect: () => {},
        });

        // Android Auto transport commands → player actions
        NativeMediaBridge.setup({
            onBluetoothConnected: () => {
                if (queue.currentMedia) player.play();
            },
            onBluetoothDisconnected: () => {},
            onAutoPlay: () => player.play(),
            onAutoPause: () => player.pause(),
            onAutoNext: () => queue.skipForward(),
            onAutoPrevious: () => queue.skipBack(),
            onAutoSeekTo: (seconds) => player.setCurrentTime(seconds, true),
            onAutoSkipToIndex: (index) => {
                const item = queue.queue[index];
                if (item) {
                    queue.setQueueMediaId(item.queueMediaId);
                    player.play();
                }
            },
        });

        // Current media → lock-screen metadata + Android Auto now-playing
        queue.currentMediaAtom.subscribe((): void => {
            const media = queue.currentMedia;
            if (media) {
                AudioIntegrationService.setLockScreenActive(
                    true,
                    lockScreenMetadata(media),
                    { showSeekForward: true, showSeekBackward: true }
                );
                NativeMediaBridge.updateNowPlaying(
                    media.name,
                    getMediaArtists(media)
                        .map((artist) => artist.name)
                        .join(", "),
                    getMediaSubtitle(media),
                    media.imageUrl,
                    getMediaDuration(media)
                );
            } else {
                AudioIntegrationService.setLockScreenActive(false);
            }
        });

        // Playback state (playing + position) → OS controls
        const pushPlaybackState = (): void => {
            const isPlaying = player.playingAtom.get();
            const time = player.currentTime;
            AudioIntegrationService.updatePlaybackState(isPlaying, time);
            NativeMediaBridge.updatePlaybackState(
                isPlaying,
                Math.round(time * 1000)
            );
        };
        player.playingAtom.subscribe(pushPlaybackState);
        player.currentTimeAtom.subscribe(pushPlaybackState);

        // Queue → Android Auto browsable queue
        queue.queueAtom.subscribe((): void => {
            const autoQueue: AutoQueueItem[] = queue.queue.map((item) => ({
                mediaId: item.media.publicId,
                title: item.media.name,
                artist: getMediaArtists(item.media)
                    .map((artist) => artist.name)
                    .join(", "),
                album: getMediaSubtitle(item.media),
                artworkUrl: item.media.imageUrl,
                duration: getMediaDuration(item.media) ?? 0,
            }));
            const currentIndex = queue.queue.findIndex(
                (item) => item.queueMediaId === queue.currentQueueMediaId
            );
            NativeMediaBridge.updateQueue(autoQueue, currentIndex);
        });
    }
}
