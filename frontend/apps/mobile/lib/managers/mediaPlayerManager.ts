import {
    BaseMediaPlayerManager,
    createAtom,
    getMediaAudioSrc,
    getMediaVideoSrc,
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
                if (isPlaying) this.onNativePlaying();
                else this.onNativePaused();
            }
        );
        this._videoPlayer.addListener("timeUpdate", ({ currentTime }): void => {
            this._durationAtom.set(this._videoPlayer.duration ?? 0);
            this.onNativeTimeUpdate(currentTime);
        });
        this._videoPlayer.addListener("playToEnd", (): void =>
            this.onNativeEnded()
        );
        this._videoPlayer.addListener("statusChange", ({ status }): void => {
            if (status === "loading") {
                this.onNativeLoadStart();
            } else if (status === "readyToPlay") {
                this.onNativeLoaded();
                this._durationAtom.set(this._videoPlayer.duration ?? 0);
            }
        });
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
                if (
                    typeof status.duration === "number" &&
                    status.duration > 0
                ) {
                    this._durationAtom.set(status.duration);
                }
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
        return this._videoPlayer.replaceAsync({ uri }).then((): void => {});
    }

    protected override clearNativeSource(kind: TMediaKind): void {
        if (kind === "audio") {
            this._destroyAudioPlayer();
            return;
        }
        this._videoPlayer.pause();
        void this._videoPlayer.replaceAsync(null);
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
                getMediaAudioSrc(media) ?? getMediaVideoSrc(media) ?? undefined
            );
        }
        return getMediaAudioSrc(media) ?? undefined;
    }

    protected override async resolveMediaUriAsync(
        media: TPlayableMedia,
        kind: TMediaKind
    ): Promise<string | undefined> {
        const remoteUri = this._remoteUri(media, kind);
        if (!remoteUri) return undefined;

        try {
            const localUri = await mediaStorage.getSongUri(media.publicId);
            if (localUri) return localUri;
        } catch {
            // Fall through to cache/remote
        }

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
