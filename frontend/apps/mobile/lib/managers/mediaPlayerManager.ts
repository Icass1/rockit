import {
    BaseMediaPlayerManager,
    createAtom,
    getMediaAudioUrl,
    getMediaDuration,
    getMediaVideoUrl,
    type ReadonlyAtom,
    type TMediaKind,
    type TPlayableMedia,
} from "@rockit/shared";
import {
    createAudioPlayer,
    setAudioModeAsync,
    type AudioPlayer,
    type AudioStatus,
} from "expo-audio";
import { createVideoPlayer, type VideoPlayer } from "expo-video";
import {
    DEFAULT_CROSSFADE,
    type CrossfadeSettings,
} from "@/lib/audio/crossfade";
import { mediaCacheManager } from "@/lib/audio/MediaCacheManager";
import { mediaStorage } from "@/lib/storage/mediaStorage";

/**
 * Mobile media player: implements the shared BaseMediaPlayerManager primitives
 * against a single expo-audio player and a persistent expo-video player. All
 * playback/queue orchestration lives in the base class.
 *
 * This is single-deck: the previous dual-deck crossfade/preload engine was
 * dropped so mobile matches web's canonical single-element behavior.
 */
export class MediaPlayerManager extends BaseMediaPlayerManager {
    private _audioPlayer: AudioPlayer | null = null;
    private _audioSub: { remove: () => void } | null = null;

    private _videoPlayer: VideoPlayer;
    private _videoPlayerAtom = createAtom<VideoPlayer | null>(null);

    // True while the persistent video player is swapping its source. During a
    // swap expo-video emits spurious playToEnd / timeUpdate / playingChange
    // events for the outgoing source; handling them would clobber the progress
    // bar and (via onNativeEnded → _handleEnded) trigger runaway queue skips.
    private _videoReplacing = false;

    private _durationAtom = createAtom<number>(0);
    private _crossfadeSettingsAtom =
        createAtom<CrossfadeSettings>(DEFAULT_CROSSFADE);

    // Remote URI we last seeded into the disk cache (so we can evict on switch).
    private _seededRemoteUri?: string;

    constructor() {
        super();

        setAudioModeAsync({
            allowsRecording: false,
            shouldPlayInBackground: true,
            interruptionMode: "doNotMix",
            playsInSilentMode: true,
            interruptionModeAndroid: "doNotMix",
            shouldRouteThroughEarpiece: false,
        });

        this._videoPlayer = createVideoPlayer(null);
        this._videoPlayer.loop = false;
        this._videoPlayer.muted = false;
        this._videoPlayer.staysActiveInBackground = true;
        this._videoPlayer.timeUpdateEventInterval = 0.25;
        this._videoPlayerAtom.set(this._videoPlayer);

        this._videoPlayer.addListener(
            "playingChange",
            ({ isPlaying }): void => {
                // The persistent video player keeps emitting events even when
                // the audio deck is the active source; ignore them so it can't
                // clobber audio playback state. Also ignore while swapping the
                // source (video → video skip), where transient events fire.
                if (this._audioPlayer || this._videoReplacing) return;
                if (isPlaying) this.onNativePlaying();
                else this.onNativePaused();
            }
        );
        this._videoPlayer.addListener("timeUpdate", ({ currentTime }): void => {
            // Same guard: while playing audio the idle video player ticks with
            // currentTime === 0 and would otherwise reset the progress bar; and
            // during a source swap it emits stale positions.
            if (this._audioPlayer || this._videoReplacing) return;
            this._setDuration(this._videoPlayer.duration);
            this.onNativeTimeUpdate(currentTime);
        });
        this._videoPlayer.addListener("playToEnd", (): void => {
            // Same guard as playingChange/timeUpdate. Beyond the idle-audio-deck
            // case, replacing the source (including a video → video skip) makes
            // expo-video emit playToEnd for the outgoing source; without the
            // _videoReplacing guard that would fire onNativeEnded → _handleEnded
            // and skip the queue again, cascading into runaway skips.
            if (this._audioPlayer || this._videoReplacing) return;
            this.onNativeEnded();
        });
        this._videoPlayer.addListener("statusChange", ({ status }): void => {
            if (status === "loading") {
                this.onNativeLoadStart();
            } else if (status === "readyToPlay") {
                this.onNativeLoaded();
                this._setDuration(this._videoPlayer.duration);
            }
        });
    }

    // ===== Duration =====

    /**
     * Publish a duration, ignoring anything that isn't a finite positive
     * number. This filters the native "unknown duration" sentinel
     * (ExoPlayer/AVPlayer report a huge negative TIME_UNSET value before the
     * media is ready) as well as transient 0s on status ticks, so a known-good
     * duration is never clobbered by a bad reading.
     */
    private _setDuration(value: number): void {
        if (typeof value === "number" && isFinite(value) && value > 0) {
            this._durationAtom.set(value);
        }
    }

    // ===== expo-audio player lifecycle (single deck) =====

    private _createAudioPlayer(uri: string): void {
        this._destroyAudioPlayer();

        const player = createAudioPlayer(uri, { updateInterval: 250 });
        player.shouldCorrectPitch = true;

        this._audioSub = player.addListener(
            "playbackStatusUpdate",
            (status: AudioStatus): void => {
                if (!status) return;
                this._setDuration(status.duration);
                if (status.playing) this.onNativePlaying();
                else this.onNativePaused();
                if (typeof status.currentTime === "number") {
                    this.onNativeTimeUpdate(status.currentTime);
                }
                if (status.didJustFinish) this.onNativeEnded();
            }
        );

        this._audioPlayer = player;
    }

    private _destroyAudioPlayer(): void {
        if (!this._audioPlayer) return;
        try {
            this._audioPlayer.pause();
        } catch {
            // player already released
        }
        this._audioSub?.remove();
        this._audioPlayer.remove();
        this._audioPlayer = null;
        this._audioSub = null;
    }

    // ===== Platform primitives =====

    protected override loadNativeSource(
        kind: TMediaKind,
        uri: string
    ): void | Promise<void> {
        if (kind === "audio") {
            this._createAudioPlayer(uri);
            return;
        }
        this._videoReplacing = true;
        return this._videoPlayer
            .replaceAsync({ uri })
            .then((): void => {})
            .finally((): void => {
                this._videoReplacing = false;
            });
    }

    protected override clearNativeSource(kind: TMediaKind): void {
        if (kind === "audio") {
            this._destroyAudioPlayer();
            return;
        }
        this._videoPlayer.pause();
        this._videoReplacing = true;
        void this._videoPlayer.replaceAsync(null).finally((): void => {
            this._videoReplacing = false;
        });
    }

    protected override playNative(kind: TMediaKind): void {
        if (kind === "audio") this._audioPlayer?.play();
        else this._videoPlayer.play();
    }

    protected override pauseNative(kind: TMediaKind): void {
        if (kind === "audio") this._audioPlayer?.pause();
        else this._videoPlayer.pause();
    }

    protected override seekNative(kind: TMediaKind, sec: number): void {
        if (kind === "audio") this._audioPlayer?.seekTo(sec);
        else this._videoPlayer.currentTime = sec;
    }

    protected override getNativePosition(kind: TMediaKind): number {
        if (kind === "audio") return this._audioPlayer?.currentTime ?? 0;
        return this._videoPlayer.currentTime ?? 0;
    }

    protected override setNativeVolume(kind: TMediaKind, vol: number): void {
        if (kind === "audio") {
            if (this._audioPlayer) this._audioPlayer.volume = vol;
        } else {
            this._videoPlayer.volume = vol;
        }
    }

    protected override getNativeVolume(kind: TMediaKind): number {
        if (kind === "audio") return this._audioPlayer?.volume ?? 1;
        return this._videoPlayer.volume ?? 1;
    }

    protected override isNativePaused(kind: TMediaKind): boolean {
        if (kind === "audio") return !this._audioPlayer?.playing;
        return !this._videoPlayer.playing;
    }

    // ===== URI resolution + caching =====

    private _remoteUri(
        media: TPlayableMedia,
        kind: TMediaKind
    ): string | undefined {
        if (kind === "video") {
            return (
                getMediaVideoUrl(media) ?? getMediaAudioUrl(media) ?? undefined
            );
        }
        return getMediaAudioUrl(media) ?? undefined;
    }

    protected override async resolveMediaUriAsync(
        media: TPlayableMedia,
        kind: TMediaKind
    ): Promise<string | undefined> {
        const remoteUri = this._remoteUri(media, kind);
        if (!remoteUri) return undefined;

        try {
            const localUri =
                kind === "video"
                    ? await mediaStorage.getVideoUri(media.publicId)
                    : await mediaStorage.getSongUri(media.publicId);
            if (localUri) return localUri;
        } catch {
            // Fall through to cache/remote
        }

        // Only the audio deck seeds the disk cache, and the audio/video stream
        // URLs collide on the same publicId-keyed cache filename — so reading it
        // for the video deck would load the cached audio (black picture). Videos
        // therefore stream straight from the remote URL.
        if (kind === "video") return remoteUri;

        const cached = await mediaCacheManager.getCachedUri(
            remoteUri,
            media.publicId
        );
        return cached ?? remoteUri;
    }

    protected override async afterMediaLoadedAsync(
        media: TPlayableMedia,
        kind: TMediaKind,
        resolvedUri: string
    ): Promise<void> {
        // Prefer the authoritative duration from the media DTO; the native
        // player only refines it later (and may report a bogus sentinel).
        this._setDuration(getMediaDuration(media) ?? 0);

        if (kind !== "audio") return;

        const remoteUri = this._remoteUri(media, "audio");

        // Evict the previously seeded track before caching the new one.
        if (this._seededRemoteUri && this._seededRemoteUri !== remoteUri) {
            void mediaCacheManager.deleteCached(this._seededRemoteUri);
            this._seededRemoteUri = undefined;
        }

        // Seed the cache only when playing straight from the remote URL.
        if (remoteUri && resolvedUri === remoteUri) {
            void mediaCacheManager.downloadToCache(remoteUri, media.publicId);
            this._seededRemoteUri = remoteUri;
        }
    }

    // ===== Mobile-only surface =====

    get videoPlayerAtom(): ReadonlyAtom<VideoPlayer | null> {
        return this._videoPlayerAtom.getReadonlyAtom();
    }

    get durationAtom(): ReadonlyAtom<number> {
        return this._durationAtom.getReadonlyAtom();
    }

    get crossfadeSettingsAtom(): ReadonlyAtom<CrossfadeSettings> {
        return this._crossfadeSettingsAtom.getReadonlyAtom();
    }

    updateCrossfadeSettings(settings: Partial<CrossfadeSettings>): void {
        this._crossfadeSettingsAtom.set({
            ...this._crossfadeSettingsAtom.get(),
            ...settings,
        });
    }
}
