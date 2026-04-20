import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform, TurboModuleRegistry } from "react-native";

export interface AudioIntegrationConfig {
    stayActiveInBackground: boolean;
    autoPlayOnBluetoothConnect: boolean;
    autoPlayOnWiredHeadsetConnect: boolean;
}

export const DEFAULT_AUDIO_INTEGRATION_CONFIG: AudioIntegrationConfig = {
    stayActiveInBackground: true,
    autoPlayOnBluetoothConnect: true,
    autoPlayOnWiredHeadsetConnect: true,
};

export interface LockScreenMetadata {
    title: string;
    artist?: string;
    albumTitle?: string;
    artworkUrl?: string;
    duration?: number;
    isLiveStream?: boolean;
}

export interface LockScreenOptions {
    showSeekForward?: boolean;
    showSeekBackward?: boolean;
}

interface AudioIntegrationCallbacks {
    onPlay: () => void;
    onPause: () => void;
    onSeekForward: (seconds: number) => void;
    onSeekBackward: (seconds: number) => void;
    onNextTrack: () => void;
    onPreviousTrack: () => void;
    onBluetoothConnect: () => void;
    onBluetoothDisconnect: () => void;
    onHeadsetConnect: () => void;
    onHeadsetDisconnect: () => void;
}

type MediaControlClass = any;
type CommandEnum = any;
type PlaybackStateEnum = any;

class AudioIntegrationServiceClass {
    private callbacks: AudioIntegrationCallbacks | null = null;
    private config: AudioIntegrationConfig = DEFAULT_AUDIO_INTEGRATION_CONFIG;
    private currentMetadata: LockScreenMetadata | null = null;
    private isLockScreenActive = false;
    private isMediaControlEnabled = false;
    private appStateListener: { remove: () => void } | null = null;
    private isInitialized = false;
    private mediaControlListener: (() => void) | null = null;
    private skipForwardInterval = 10;
    private skipBackwardInterval = 10;
    private mediaControl: MediaControlClass | null = null;
    private Command: CommandEnum | null = null;
    private PlaybackState: PlaybackStateEnum | null = null;

    constructor() {
        if (Platform.OS !== "web") {
            this.init();
        }
    }

    private async init() {
        this.setupAppStateListener();
        await this.setupMediaControlListeners();
        this.isInitialized = true;
    }

    private async ensureMediaControlLoaded() {
        if (this.mediaControl) return;
        if (Platform.OS === "web") return;
        if (!TurboModuleRegistry.get("ExpoMediaControl")) return;

        try {
            const mod = await import("expo-media-control");
            this.mediaControl = mod.MediaControl;
            this.Command = mod.Command;
            this.PlaybackState = mod.PlaybackState;
        } catch {
            // Module not available
        }
    }

    private setupAppStateListener() {
        this.appStateListener = AppState.addEventListener(
            "change",
            this.handleAppStateChange.bind(this)
        );
    }

    private handleAppStateChange(nextAppState: AppStateStatus) {
        if (nextAppState === "active") {
            this.syncWithSystemMedia();
        }
    }

    private async setupMediaControlListeners() {
        await this.ensureMediaControlLoaded();
        if (!this.mediaControl || !this.Command) return;

        this.mediaControlListener = this.mediaControl.addListener(
            this.handleMediaControlEvent.bind(this)
        );
    }

    private handleMediaControlEvent(event: { command: string }) {
        if (!this.Command) return;

        switch (event.command) {
            case this.Command.PLAY:
                this.emitPlay();
                break;
            case this.Command.PAUSE:
                this.emitPause();
                break;
            case this.Command.NEXT_TRACK:
                this.emitNextTrack();
                break;
            case this.Command.PREVIOUS_TRACK:
                this.emitPreviousTrack();
                break;
            case this.Command.SKIP_FORWARD:
                this.emitSeekForward();
                break;
            case this.Command.SKIP_BACKWARD:
                this.emitSeekBackward();
                break;
        }
    }

    private syncWithSystemMedia() {
        // Sync playback state with system media session if needed
    }

    setCallbacks(callbacks: AudioIntegrationCallbacks) {
        this.callbacks = callbacks;
    }

    setConfig(config: Partial<AudioIntegrationConfig>) {
        this.config = { ...this.config, ...config };
    }

    getConfig(): AudioIntegrationConfig {
        return { ...this.config };
    }

    isAutoPlayOnBluetoothEnabled(): boolean {
        return this.config.autoPlayOnBluetoothConnect;
    }

    isAutoPlayOnHeadsetEnabled(): boolean {
        return this.config.autoPlayOnWiredHeadsetConnect;
    }

    async setLockScreenActive(
        active: boolean,
        metadata?: LockScreenMetadata,
        options?: LockScreenOptions
    ): Promise<void> {
        this.isLockScreenActive = active;

        if (active && metadata) {
            this.currentMetadata = metadata;
            this.skipForwardInterval =
                options?.showSeekForward !== false ? 10 : 0;
            this.skipBackwardInterval =
                options?.showSeekBackward !== false ? 10 : 0;
            await this.updateNowPlayingMetadata(metadata);
        } else if (!active) {
            this.currentMetadata = null;
            await this.clearNowPlayingMetadata();
        }
    }

    private async updateNowPlayingMetadata(
        metadata: LockScreenMetadata
    ): Promise<void> {
        await this.ensureMediaControlLoaded();
        if (!this.mediaControl || !this.Command) return;

        if (!this.isMediaControlEnabled) {
            await this.mediaControl.enableMediaControls({
                capabilities: [
                    this.Command.PLAY,
                    this.Command.PAUSE,
                    this.Command.NEXT_TRACK,
                    this.Command.PREVIOUS_TRACK,
                    this.Command.SKIP_FORWARD,
                    this.Command.SKIP_BACKWARD,
                ],
            });
            this.isMediaControlEnabled = true;
        }

        const mediaMetadata: Record<string, unknown> = {
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.albumTitle,
            duration: metadata.duration,
            elapsedTime: 0,
        };

        if (metadata.artworkUrl) {
            mediaMetadata.artwork = { uri: metadata.artworkUrl };
        }

        await this.mediaControl.updateMetadata(mediaMetadata);
    }

    private async clearNowPlayingMetadata(): Promise<void> {
        await this.ensureMediaControlLoaded();
        if (!this.mediaControl || !this.isMediaControlEnabled) return;
        await this.mediaControl.disableMediaControls();
        this.isMediaControlEnabled = false;
    }

    async updatePlaybackState(
        isPlaying: boolean,
        position: number = 0
    ): Promise<void> {
        await this.ensureMediaControlLoaded();
        if (!this.mediaControl || !this.PlaybackState) return;
        if (!this.isLockScreenActive || !this.currentMetadata) return;

        const state = isPlaying
            ? this.PlaybackState.PLAYING
            : this.PlaybackState.PAUSED;
        const playbackRate = isPlaying ? 1.0 : 0.0;

        await this.mediaControl.updatePlaybackState(
            state,
            position,
            playbackRate
        );
    }

    emitPlay() {
        this.callbacks?.onPlay();
    }

    emitPause() {
        this.callbacks?.onPause();
    }

    emitSeekForward() {
        this.callbacks?.onSeekForward(this.skipForwardInterval);
    }

    emitSeekBackward() {
        this.callbacks?.onSeekBackward(this.skipBackwardInterval);
    }

    emitNextTrack() {
        this.callbacks?.onNextTrack();
    }

    emitPreviousTrack() {
        this.callbacks?.onPreviousTrack();
    }

    emitBluetoothConnect() {
        if (this.config.autoPlayOnBluetoothConnect) {
            setTimeout(() => {
                this.callbacks?.onBluetoothConnect();
            }, 500);
        }
    }

    emitBluetoothDisconnect() {
        this.callbacks?.onBluetoothDisconnect();
    }

    emitHeadsetConnect() {
        if (this.config.autoPlayOnWiredHeadsetConnect) {
            setTimeout(() => {
                this.callbacks?.onHeadsetConnect();
            }, 500);
        }
    }

    emitHeadsetDisconnect() {
        this.callbacks?.onHeadsetDisconnect();
    }

    dispose() {
        this.appStateListener?.remove();
        if (this.mediaControlListener) {
            this.mediaControlListener();
        }
    }
}

export const AudioIntegrationService = new AudioIntegrationServiceClass();

export function useAudioIntegration(callbacks: AudioIntegrationCallbacks) {
    const callbacksRef = useRef(callbacks);

    useEffect(() => {
        callbacksRef.current = callbacks;
        AudioIntegrationService.setCallbacks(callbacks);
    }, [callbacks]);

    const updateConfig = useCallback(
        (config: Partial<AudioIntegrationConfig>) => {
            AudioIntegrationService.setConfig(config);
        },
        []
    );

    const getConfig = useCallback(
        () => AudioIntegrationService.getConfig(),
        []
    );

    const setLockScreenActive = useCallback(
        async (
            active: boolean,
            metadata?: LockScreenMetadata,
            options?: LockScreenOptions
        ) => {
            await AudioIntegrationService.setLockScreenActive(
                active,
                metadata,
                options
            );
        },
        []
    );

    const updatePlaybackState = useCallback(
        async (isPlaying: boolean, position: number = 0) => {
            await AudioIntegrationService.updatePlaybackState(
                isPlaying,
                position
            );
        },
        []
    );

    const isAutoPlayOnBluetoothEnabled = useCallback(
        () => AudioIntegrationService.isAutoPlayOnBluetoothEnabled(),
        []
    );

    const isAutoPlayOnHeadsetEnabled = useCallback(
        () => AudioIntegrationService.isAutoPlayOnHeadsetEnabled(),
        []
    );

    return {
        updateConfig,
        getConfig,
        setLockScreenActive,
        updatePlaybackState,
        isAutoPlayOnBluetoothEnabled,
        isAutoPlayOnHeadsetEnabled,
    };
}
