import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

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

class AudioIntegrationServiceClass {
    private callbacks: AudioIntegrationCallbacks | null = null;
    private config: AudioIntegrationConfig = DEFAULT_AUDIO_INTEGRATION_CONFIG;
    private currentMetadata: LockScreenMetadata | null = null;
    private isLockScreenActive = false;
    private appStateListener: { remove: () => void } | null = null;
    private isInitialized = false;
    private playbackListener: { remove: () => void } | null = null;

    constructor() {
        if (Platform.OS !== "web") {
            this.init();
        }
    }

    private async init() {
        this.setupAppStateListener();
        this.setupPlaybackListener();
        this.isInitialized = true;
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

    private setupPlaybackListener() {
        // Listen for playback events from system
    }

    private syncWithSystemMedia() {
        // Sync playback state with system media session
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
            await this.updateNowPlayingMetadata();
        } else if (!active) {
            this.currentMetadata = null;
            await this.clearNowPlayingMetadata();
        }
    }

    private async updateNowPlayingMetadata() {
        // Platform-specific lock screen metadata update
        // For Android: uses expo-audio's setActiveForLockScreen when available
        // This is handled by the audio engine through expo-audio
    }

    private async clearNowPlayingMetadata() {
        // Clear lock screen metadata
    }

    async updatePlaybackState(isPlaying: boolean): Promise<void> {
        // Update system media session with current playback state
        if (this.isLockScreenActive) {
            // Notify system of playback state change for lock screen controls
        }
    }

    emitPlay() {
        this.callbacks?.onPlay();
    }

    emitPause() {
        this.callbacks?.onPause();
    }

    emitSeekForward() {
        this.callbacks?.onSeekForward(10);
    }

    emitSeekBackward() {
        this.callbacks?.onSeekBackward(10);
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
        this.playbackListener?.remove();
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

    const updatePlaybackState = useCallback(async (isPlaying: boolean) => {
        await AudioIntegrationService.updatePlaybackState(isPlaying);
    }, []);

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
