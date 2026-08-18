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

// NativeMediaBridge expects durations in milliseconds; getMediaDuration()
// returns seconds, so every value crossing that bridge must be converted.
function toDurationMs(seconds: number | undefined): number {
    return Math.round((seconds ?? 0) * 1000);
}

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
            onAutoStop: () => player.pause(),
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
            // Best-effort recovery for a Bluetooth car stereo that silently
            // drops the A2DP audio stream mid-track (song keeps advancing,
            // no sound) without a full profile disconnect. A quick
            // pause/resume forces expo-audio to re-engage the audio route;
            // it's a no-op audible blip if the route was actually fine.
            onAudioRouteChanged: () => {
                if (!player.playingAtom.get()) return;
                player.pause();
                setTimeout(() => player.play(), 300);
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
                    toDurationMs(getMediaDuration(media))
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

        // currentTimeAtom ticks ~4x/sec (see mediaPlayerManager's
        // updateInterval); pushing every tick rebuilds the Android
        // notification + queue that often, which is unnecessary churn — the
        // OS extrapolates position between updates, so once a second is
        // plenty and cuts down on background binder/notification load.
        const POSITION_PUSH_INTERVAL_MS = 1000;
        let lastPositionPushAt = 0;
        player.currentTimeAtom.subscribe(() => {
            const now = Date.now();
            if (now - lastPositionPushAt < POSITION_PUSH_INTERVAL_MS) return;
            lastPositionPushAt = now;
            pushPlaybackState();
        });

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
                duration: toDurationMs(getMediaDuration(item.media)),
            }));
            const currentIndex = queue.queue.findIndex(
                (item) => item.queueMediaId === queue.currentQueueMediaId
            );
            NativeMediaBridge.updateQueue(autoQueue, currentIndex);
        });
    }
}
